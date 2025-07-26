import { MessageRepository } from '../repositories/messageRepository';
import { AuthenticatedUser } from '../types/user';
import messageCache from '../utils/messageCache';
import logger from '../utils/logger';
import { safeJsonParse } from '../utils/json';
import {
  MessageWithSender,
  ConversationWithDetails,
  ConversationResponse,
  ConversationMessagesResponse,
  LoadMoreMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  ConversationPaginationParams,
  MessagePaginationResponse,
  Conversation
} from '../types/message';

export class ConversationService {
  constructor(private messageRepository: MessageRepository) {}

  async getConversations(
    currentUser: AuthenticatedUser,
    page: number = 1,
    limit: number = 15
  ): Promise<ConversationResponse> {
    const pageLimit = Math.min(limit, 25);

    // Check cache first for the first page
    if (page === 1) {
      const cachedConversations = messageCache.getUserConversations(currentUser.id);
      if (cachedConversations) {
        const response: ConversationResponse = {
          conversations: cachedConversations.slice(0, pageLimit) as unknown as ConversationWithDetails[],
          pagination: {
            page: 1,
            limit: pageLimit,
            hasMore: cachedConversations.length > pageLimit
          },
          cached: true
        };
        return response;
      }
    }

    // Get conversations with optimized query
    const conversations = await this.messageRepository.findConversationsByUserId(currentUser.id, {
      page,
      limit: pageLimit
    });

    if (conversations.length === 0) {
      return {
        conversations: [],
        pagination: {
          page,
          limit: pageLimit,
          hasMore: false
        }
      };
    }

    // Get participants for all conversations in a single query
    const conversationIds = conversations.map(c => c.id);
    const allParticipants = await this.messageRepository.findParticipantsByConversationIds(conversationIds);

    // Group participants by conversation
    const participantsByConversation: Record<string, any[]> = {};
    allParticipants.forEach(participant => {
      if (!participantsByConversation[participant.conversation_id]) {
        participantsByConversation[participant.conversation_id] = [];
      }
      participantsByConversation[participant.conversation_id]!.push(participant);
    });

    // Format response efficiently
    const formattedConversations: ConversationWithDetails[] = conversations.map(conv => {
      const participants = participantsByConversation[conv.id] || [];
      const otherParticipants = participants.filter(p => p.id !== currentUser.id);
      
      const otherUser = conv.type === 'direct' && otherParticipants.length > 0 
        ? otherParticipants[0] 
        : null;

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        avatar_url: conv.conversation_avatar,
        created_by: conv.created_by || '',
        is_active: true,
        created_at: conv.conversation_created_at,
        participants: participants.map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          email: p.email,
          avatar_url: p.avatar_url,
          user_type: p.user_type,
          role: 'user' as const,
          is_active: true
        })),
        other_user: otherUser ? {
          id: otherUser.id,
          first_name: otherUser.first_name,
          last_name: otherUser.last_name,
          email: otherUser.email,
          avatar_url: otherUser.avatar_url,
          user_type: otherUser.user_type,
          role: 'user' as const,
          is_active: true,
          created_at: new Date(),
          updated_at: new Date()
        } : undefined,
        last_message: conv.last_message_content ? {
          content: conv.last_message_content,
          message_type: conv.last_message_type,
          created_at: conv.last_message_created_at,
          is_from_me: conv.last_message_sender_id === currentUser.id
        } : undefined,
        unread_count: parseInt(conv.unread_count) || 0,
        last_activity: conv.last_message_at
      };
    });

    // Cache the results for the first page
    if (page === 1) {
      messageCache.setUserConversations(currentUser.id, formattedConversations as unknown as any[]);
    }

    return {
      conversations: formattedConversations,
      pagination: {
        page,
        limit: pageLimit,
        hasMore: formattedConversations.length === pageLimit
      }
    };
  }

  async getConversationMessages(
    conversationId: string,
    currentUser: AuthenticatedUser,
    options: ConversationPaginationParams = {}
  ): Promise<ConversationMessagesResponse> {
    const { 
      page = 1, 
      limit = 25,
      cursor,
      loadDirection = 'before'
    } = options;
    
    const pageLimit = Math.min(limit, 50);

    // Verify conversation exists and user is a participant
    const participant = await this.messageRepository.findConversationParticipant(conversationId, currentUser.id);

    if (!participant) {
      throw new Error('Conversation not found or access denied');
    }

    // Get messages using repository
    const messages = await this.messageRepository.findMessagesByConversationId(conversationId, {
      limit: pageLimit,
      cursor,
      loadDirection
    });

    // Check if there are more messages
    const hasMore = messages.length > pageLimit;
    if (hasMore) {
      messages.pop();
    }

    // Determine cursors for pagination
    let nextCursor: string | undefined;
    let prevCursor: string | undefined;
    
    if (messages.length > 0) {
      if (loadDirection === 'after') {
        nextCursor = messages[messages.length - 1].created_at.toISOString();
        prevCursor = messages[0].created_at.toISOString();
      } else {
        nextCursor = messages[0].created_at.toISOString();
        prevCursor = messages[messages.length - 1].created_at.toISOString();
        messages.reverse();
      }
    }

    // Format messages efficiently
    const formattedMessages: MessageWithSender[] = messages.map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      message_type: msg.message_type,
      reply_to_id: msg.reply_to_id,
      is_read: Boolean(msg.is_read),
      is_edited: Boolean(msg.is_edited),
      is_deleted: false,
      edited_at: msg.edited_at,
      read_status: msg.read_status || 'sent',
      reactions: safeJsonParse(msg.reactions, {}),
      created_at: msg.created_at,
      updated_at: msg.updated_at,
      sender: {
        id: msg.sender_id,
        first_name: msg.sender_first_name,
        last_name: msg.sender_last_name,
        email: msg.sender_email,
        avatar_url: msg.sender_avatar,
        user_type: msg.sender_user_type,
        role: msg.sender_role,
        is_active: Boolean(msg.sender_is_active)
      },
      is_from_me: Boolean(msg.sender_id === currentUser.id)
    }));

    // Get conversation details and participants
    const [conversation, participants] = await Promise.all([
      this.messageRepository.findConversationById(conversationId),
      this.messageRepository.findParticipantsByConversationId(conversationId)
    ]);

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // For direct chats, identify the other user
    const otherUser = conversation.type === 'direct' 
      ? participants.find(p => p.id !== currentUser.id)
      : null;

    // Auto-mark conversation as read when user opens it
    if (participant.unread_count > 0) {
      this.messageRepository.markConversationAsRead(conversationId, currentUser.id)
        .catch(error => logger.error('Error updating unread count:', error));
    }

    const pagination: MessagePaginationResponse = {
      hasMore,
      nextCursor: hasMore ? nextCursor : undefined,
      prevCursor,
      limit: pageLimit,
      loadDirection
    };

    return {
      messages: formattedMessages,
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        avatar_url: conversation.avatar_url,
        created_by: conversation.created_by,
        is_active: conversation.is_active,
        created_at: conversation.created_at,
        updated_at: conversation.updated_at
      },
      participants: participants.map(p => ({
        id: p.id,
        first_name: p.first_name,
        last_name: p.last_name,
        email: p.email,
        avatar_url: p.avatar_url,
        user_type: p.user_type,
        role: p.role,
        is_active: Boolean(p.is_active),
        created_at: p.created_at,
        updated_at: p.updated_at
      })),
      other_user: otherUser ? {
        id: otherUser.id,
        first_name: otherUser.first_name,
        last_name: otherUser.last_name,
        email: otherUser.email,
        avatar_url: otherUser.avatar_url,
        user_type: otherUser.user_type,
        role: otherUser.role,
        is_active: Boolean(otherUser.is_active),
        created_at: otherUser.created_at,
        updated_at: otherUser.updated_at
      } : undefined,
      pagination,
      meta: {
        total_unread: participant.unread_count,
        conversation_id: conversationId
      }
    };
  }

  async loadMoreMessages(
    conversationId: string,
    currentUser: AuthenticatedUser,
    cursor: string,
    direction: 'before' | 'after' = 'before',
    limit: number = 20
  ): Promise<LoadMoreMessagesResponse> {
    const pageLimit = Math.min(limit, 30);

    // Verify user is participant (quick check)
    const isParticipant = await this.messageRepository.findConversationParticipant(conversationId, currentUser.id);

    if (!isParticipant) {
      throw new Error('Access denied');
    }

    // Get more messages using repository
    const messages = await this.messageRepository.findLoadMoreMessages(conversationId, cursor, direction, pageLimit);

    // Check if there are more messages
    const hasMore = messages.length > pageLimit;
    if (hasMore) {
      messages.pop();
    }

    // Determine next cursor
    let nextCursor: string | undefined;
    if (messages.length > 0) {
      if (direction === 'before') {
        nextCursor = messages[messages.length - 1].created_at.toISOString();
        messages.reverse(); // Show in chronological order
      } else {
        nextCursor = messages[messages.length - 1].created_at.toISOString();
      }
    }

    // Format messages (lightweight)
    const formattedMessages: MessageWithSender[] = messages.map(msg => ({
      id: msg.id,
      conversation_id: conversationId,
      sender_id: msg.sender_id,
      receiver_id: undefined,
      content: msg.content,
      message_type: msg.message_type,
      reply_to_id: msg.reply_to_id,
      is_read: Boolean(msg.is_read),
      is_edited: Boolean(msg.is_edited),
      is_deleted: false,
      edited_at: msg.edited_at,
      read_status: msg.read_status || 'sent',
      reactions: safeJsonParse(msg.reactions, {}),
      created_at: msg.created_at,
      sender: {
        id: msg.sender_id,
        first_name: msg.sender_first_name,
        last_name: msg.sender_last_name,
        email: '',
        avatar_url: msg.sender_avatar,
        user_type: msg.sender_user_type,
        role: 'user',
        is_active: true
      },
      is_from_me: Boolean(msg.sender_id === currentUser.id)
    }));

    return {
      messages: formattedMessages,
      pagination: {
        hasMore,
        nextCursor: hasMore ? nextCursor : undefined,
        limit: pageLimit,
        loadDirection: direction
      }
    };
  }

  async sendMessageToConversation(
    conversationId: string,
    messageData: Omit<SendMessageRequest, 'conversation_id' | 'receiver_id'>,
    currentUser: AuthenticatedUser
  ): Promise<SendMessageResponse> {
    const {
      content,
      message_type = 'text',
      reply_to_id,
      metadata
    } = messageData;

    // Verify conversation exists and user is a participant
    const participant = await this.messageRepository.findConversationParticipant(conversationId, currentUser.id);

    if (!participant) {
      throw new Error('Not a participant in this conversation');
    }

    // Get conversation details to determine receiver
    const conversation = await this.messageRepository.findConversationById(conversationId);
    if (!conversation) {
      throw new Error('Conversation not found');
    }

    let receiverId: string | undefined;
    if (conversation.type === 'direct') {
      const participants = await this.messageRepository.findParticipantsByConversationId(conversationId);
      const otherParticipant = participants.find(p => p.id !== currentUser.id);
      
      if (otherParticipant) {
        receiverId = otherParticipant.id;
      }
    }

    // Verify reply-to message exists if provided
    if (reply_to_id) {
      const replyMessage = await this.messageRepository.findReplyToMessage(reply_to_id, conversationId);

      if (!replyMessage) {
        throw new Error('Invalid reply-to message');
      }
    }

    // Create message
    const message = await this.messageRepository.createMessage({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      receiver_id: receiverId,
      content: content || undefined,
      message_type,
      reply_to_id: reply_to_id || undefined,
      metadata
    });

    // Get complete message data with sender info
    const completeMessage = await this.messageRepository.findMessageWithSender(message.id);

    if (!completeMessage) {
      throw new Error('Failed to retrieve created message');
    }

    // Update conversation's last message info
    await this.messageRepository.updateConversation(conversationId, {
      last_message_id: message.id,
      last_message_at: message.created_at
    });

    const formattedMessage: MessageWithSender = {
      id: completeMessage.id,
      conversation_id: conversationId,
      sender_id: completeMessage.sender_id,
      receiver_id: completeMessage.receiver_id,
      content: completeMessage.content,
      message_type: completeMessage.message_type,
      reply_to_id: completeMessage.reply_to_id,
      is_read: Boolean(completeMessage.is_read),
      is_edited: Boolean(completeMessage.is_edited),
      is_deleted: Boolean(completeMessage.is_deleted),
      edited_at: completeMessage.edited_at,
      deleted_at: completeMessage.deleted_at,
      delivered_at: completeMessage.delivered_at,
      read_at: completeMessage.read_at,
      read_status: completeMessage.read_status || 'sent',
      reactions: safeJsonParse(completeMessage.reactions, {}),
      created_at: completeMessage.created_at,
      updated_at: completeMessage.updated_at,
      sent_at: completeMessage.sent_at,
      sender: {
        id: completeMessage.sender_id,
        first_name: completeMessage.sender_first_name,
        last_name: completeMessage.sender_last_name,
        email: completeMessage.sender_email,
        avatar_url: completeMessage.sender_avatar || '',
        user_type: completeMessage.sender_user_type,
        role: completeMessage.sender_role,
        is_active: Boolean(completeMessage.sender_is_active)
      },
      is_from_me: true
    };

    // Update cache with new message
    try {
      messageCache.addMessage(conversationId, formattedMessage);
      // Invalidate conversation lists for participants since last message changed
      const participantUserIds = await this.messageRepository.findParticipantUserIds(conversationId);
      
      participantUserIds.forEach(userId => {
        messageCache.invalidateUser(userId);
      });
    } catch (cacheError) {
      logger.error('Error updating message cache:', cacheError);
    }

    return {
      message: formattedMessage,
      conversation_id: conversationId
    };
  }

  async markConversationAsRead(conversationId: string, currentUser: AuthenticatedUser): Promise<void> {
    // Verify conversation exists and user is a participant
    const participant = await this.messageRepository.findConversationParticipant(conversationId, currentUser.id);

    if (!participant) {
      throw new Error('Conversation not found or access denied');
    }

    // Reset unread count for this user in this conversation
    await this.messageRepository.markConversationAsRead(conversationId, currentUser.id);

    // Also mark individual messages as read (optional, for consistency)
    await this.messageRepository.markMessagesAsRead(conversationId, currentUser.id);
  }
} 