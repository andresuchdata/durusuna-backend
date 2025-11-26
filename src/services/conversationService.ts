import { MessageRepository } from '../repositories/messageRepository';
import { AuthenticatedUser } from '../types/user';
import messageCache from '../utils/messageCache';
import logger from '../shared/utils/logger';
import { safeJsonParse } from '../utils/json';
import { determineMessageType } from '../shared/middleware/upload';
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
import { getSocketInstance } from './socketService';

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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } : undefined,
        last_message: conv.last_message_created_at ? {
          id: conv.last_message_id,
          content: conv.last_message_content || undefined,
          text: conv.last_message_content || undefined, // Add text field for frontend compatibility
          message_type: conv.last_message_type,
          created_at: conv.last_message_created_at.toISOString(),
          is_from_me: conv.last_message_sender_id === currentUser.id,
          attachments: (() => {
            try {
              const metadata = conv.last_message_metadata ? safeJsonParse(conv.last_message_metadata, {}) : {};
              return Array.isArray(metadata.attachments) ? metadata.attachments : [];
            } catch (error) {
              logger.warn('Failed to parse message metadata for attachments:', error);
              return [];
            }
          })()
        } : undefined,
        unread_count: parseInt(conv.unread_count) || 0,
        last_activity: conv.last_message_at ? conv.last_message_at.toISOString() : undefined
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

  /// Invalidate cache for a specific user's conversations
  /// This should be called when messages are sent/received to ensure fresh data
  invalidateUserConversationsCache(userId: string): void {
    // Clear the user's conversations cache to force fresh data on next request
    messageCache.invalidateUser(userId);
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
    const formattedMessages: MessageWithSender[] = messages.map(msg => {
      // Extract attachments from metadata
      const messageMetadata = safeJsonParse(msg.metadata, {});
      const messageAttachments = messageMetadata.attachments || [];
      
      return {
        id: msg.id,
        conversation_id: msg.conversation_id,
        sender_id: msg.sender_id,
        receiver_id: msg.receiver_id,
        content: msg.content,
        message_type: msg.message_type,
        reply_to_id: msg.reply_to_id,
        attachments: messageAttachments,
        metadata: messageMetadata,
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
        reply_to: msg.reply_to_message_id ? {
          id: msg.reply_to_message_id,
          content: msg.reply_to_content,
          sender_id: msg.reply_to_sender_id,
          sender_name: `${msg.reply_to_sender_first_name} ${msg.reply_to_sender_last_name}`,
          message_type: msg.reply_to_message_type
        } : undefined,
        is_from_me: Boolean(msg.sender_id === currentUser.id)
      };
    });

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
        created_at: p.created_at.toISOString(),
        updated_at: p.updated_at?.toISOString()
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
        created_at: otherUser.created_at.toISOString(),
        updated_at: otherUser.updated_at?.toISOString()
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
      reply_to: msg.reply_to_message_id ? {
        id: msg.reply_to_message_id,
        content: msg.reply_to_content,
        sender_id: msg.reply_to_sender_id,
        sender_name: `${msg.reply_to_sender_first_name} ${msg.reply_to_sender_last_name}`,
        message_type: msg.reply_to_message_type
      } : undefined,
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
      metadata,
      client_message_id,
      attachments
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

    // Idempotency: check client_message_id
    let message: any | null = null;
    if (client_message_id) {
      message = await this.messageRepository.findMessageByClientMessageId(client_message_id, conversationId);
    }

    if (!message) {
      // Prepare metadata with attachments if provided
      const enrichedMetadata = {
        ...metadata,
        ...(attachments && attachments.length > 0 ? { attachments } : {})
      };

      // Determine message type from attachments if present, otherwise use provided type
      const finalMessageType = attachments && attachments.length > 0
        ? determineMessageType(attachments, message_type)
        : message_type;

      // Create message
      message = await this.messageRepository.createMessage({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        receiver_id: receiverId,
        content: content || undefined,
        message_type: finalMessageType,
        reply_to_id: reply_to_id || undefined,
        metadata: enrichedMetadata,
        client_message_id: client_message_id || undefined,
      });
    }

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

    // Increment unread count for all participants except the sender
    await this.messageRepository.incrementUnreadCount(conversationId, currentUser.id);

    // Extract attachments from metadata
    const messageMetadata = safeJsonParse(completeMessage.metadata, {});
    const messageAttachments = messageMetadata.attachments || [];

    const formattedMessage: MessageWithSender = {
      id: completeMessage.id,
      conversation_id: conversationId,
      sender_id: completeMessage.sender_id,
      receiver_id: completeMessage.receiver_id,
      content: completeMessage.content,
      message_type: completeMessage.message_type,
      reply_to_id: completeMessage.reply_to_id,
      attachments: messageAttachments,
      metadata: messageMetadata,
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
      sent_at: completeMessage.sent_at || new Date().toISOString(),
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
      reply_to: completeMessage.reply_to_message_id ? {
        id: completeMessage.reply_to_message_id,
        content: completeMessage.reply_to_content,
        sender_id: completeMessage.reply_to_sender_id,
        sender_name: `${completeMessage.reply_to_sender_first_name} ${completeMessage.reply_to_sender_last_name}`,
        message_type: completeMessage.reply_to_message_type
      } : undefined,
      is_from_me: true
    };

    // Update cache with new message
    try {
      // Create cache message object that matches MessageData interface
      const cacheMessage = {
        id: formattedMessage.id,
        conversation_id: formattedMessage.conversation_id,
        sender_id: formattedMessage.sender_id,
        content: formattedMessage.content,
        message_type: formattedMessage.message_type,
        reply_to_id: formattedMessage.reply_to_id,
        attachments: messageAttachments,
        metadata: messageMetadata,
        sent_at: formattedMessage.sent_at || new Date().toISOString(),
        edited_at: formattedMessage.edited_at,
        deleted_at: formattedMessage.deleted_at,
        sender: {
          id: formattedMessage.sender.id,
          first_name: formattedMessage.sender.first_name,
          last_name: formattedMessage.sender.last_name,
          avatar_url: formattedMessage.sender.avatar_url
        }
      };
      
      messageCache.addMessage(conversationId, cacheMessage);
      // Invalidate conversation lists for participants since last message changed
      const participantUserIds = await this.messageRepository.findParticipantUserIds(conversationId);
      
      participantUserIds.forEach(userId => {
        messageCache.invalidateUser(userId);
      });
    } catch (cacheError) {
      logger.error('Error updating message cache:', cacheError);
    }

    // Emit real-time message
    try {
      const io = getSocketInstance();
      if (io) {
        io.emitNewMessage(formattedMessage, conversationId);
        logger.info('✅ ConversationService: Emitted real-time message', {
          conversationId,
          messageId: formattedMessage.id,
          content: formattedMessage.content
        });
      } else {
        logger.warn('⚠️ ConversationService: Socket instance not available for real-time emission');
      }
    } catch (socketError) {
      logger.error('❌ ConversationService: Error emitting real-time message:', socketError);
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
    
    // Invalidate cache to ensure fresh data on next fetch
    messageCache.invalidateUser(currentUser.id);
  }

  async isUserParticipant(conversationId: string, userId: string): Promise<boolean> {
    const participant = await this.messageRepository.findConversationParticipant(conversationId, userId);
    return participant !== null;
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<any | null> {
    try {
      const conversation = await this.messageRepository.findDirectConversation(userId1, userId2);
      if (!conversation) {
        return null;
      }
      
      // Get full conversation details with participants
      const conversationDetails = await this.messageRepository.findConversationById(conversation.id);
      const participants = await this.messageRepository.findParticipantsByConversationId(conversation.id);
      
      return {
        ...conversationDetails,
        participants,
      };
    } catch (error) {
      logger.error('Error finding direct conversation:', error);
      return null;
    }
  }

  async createConversation(params: {
    type: string;
    createdBy: string;
    participantIds: string[];
    name?: string;
    description?: string;
  }): Promise<any> {
    try {
      const { type, createdBy, participantIds, name, description } = params;
      
      // Validate type
      if (!['direct', 'group'].includes(type)) {
        throw new Error('Invalid conversation type. Must be "direct" or "group"');
      }
      
      // For direct conversations, check if one already exists
      if (type === 'direct' && participantIds.length === 2) {
        const existingConversation = await this.findDirectConversation(participantIds[0]!, participantIds[1]!);
        if (existingConversation) {
          logger.info(`Direct conversation already exists: ${existingConversation.id}`);
          return existingConversation;
        }
      }
      
      // Create the conversation
      const conversationId = await this.messageRepository.createConversation({
        type: type as 'direct' | 'group',
        name: type === 'group' ? name : undefined,
        description: type === 'group' ? description : undefined,
        created_by: createdBy,
      });
      
      logger.info(`Created new conversation: ${conversationId}, type: ${type}`);
      
      // Add all participants
      await this.messageRepository.addParticipants(conversationId, participantIds);
      
      logger.info(`Added ${participantIds.length} participants to conversation ${conversationId}`);
      
      // Invalidate cache for all participants
      participantIds.forEach(userId => {
        messageCache.invalidateUser(userId);
      });
      
      // Get the full conversation details with participants
      const conversation = await this.messageRepository.findConversationById(conversationId);
      const participants = await this.messageRepository.findParticipantsByConversationId(conversationId);
      
      return {
        ...conversation,
        participants,
      };
    } catch (error) {
      logger.error('Error creating conversation:', error);
      throw error;
    }
  }

  async getConversationById(conversationId: string): Promise<any | null> {
    try {
      const conversation = await this.messageRepository.findConversationById(conversationId);
      return conversation;
    } catch (error) {
      logger.error('Error getting conversation by ID:', error);
      return null;
    }
  }

  async updateConversation(conversationId: string, updateData: any, userId: string): Promise<void> {
    try {
      // Verify user has permission to update
      const participant = await this.messageRepository.findConversationParticipant(conversationId, userId);
      if (!participant) {
        throw new Error('Access denied');
      }

      // Update the conversation
      await this.messageRepository.updateConversation(conversationId, updateData);
      
      // Invalidate cache for this conversation
      messageCache.invalidateUser(userId);
      
      logger.info(`Conversation ${conversationId} updated by user ${userId}`);
    } catch (error) {
      logger.error('Error updating conversation:', error);
      throw error;
    }
  }

  async getUserRoleInConversation(conversationId: string, userId: string): Promise<string> {
    try {
      const participant = await this.messageRepository.findConversationParticipant(conversationId, userId);
      if (!participant) {
        throw new Error('User not a participant');
      }
      return participant.role || 'member';
    } catch (error) {
      logger.error('Error getting user role in conversation:', error);
      return 'member';
    }
  }

  async deleteConversation(conversationId: string, userId: string): Promise<{ action: 'left' | 'deleted' }> {
    try {
      // Verify user is a participant
      const participant = await this.messageRepository.findConversationParticipant(conversationId, userId);
      if (!participant) {
        throw new Error('Access denied');
      }

      // Get conversation details
      const conversation = await this.messageRepository.findConversationById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }

      // For direct messages: Always soft delete (only hide from this user's view)
      if (conversation.type === 'direct') {
        await this.messageRepository.softDeleteParticipant(conversationId, userId);
        messageCache.invalidateUser(userId);
        logger.info(`User ${userId} deleted their view of direct conversation ${conversationId}`);
        return { action: 'deleted' };
      }

      // For group conversations: Leave the group (soft delete)
      if (conversation.type === 'group') {
        // Check if this is the last active participant who is also the creator/admin
        const activeParticipants = await this.messageRepository.findActiveParticipantsByConversationId(conversationId);
        const isLastActiveParticipant = activeParticipants.length === 1;
        const isCreatorOrAdmin = conversation.created_by === userId || participant.role === 'admin';

        if (isLastActiveParticipant && isCreatorOrAdmin) {
          // Last admin/creator leaving - delete the entire group
          await this.messageRepository.deleteConversationMessages(conversationId);
          await this.messageRepository.removeAllParticipants(conversationId);
          await this.messageRepository.deleteConversation(conversationId);
          
          // Invalidate cache for all former participants
          const allParticipantIds = await this.messageRepository.findParticipantUserIds(conversationId);
          allParticipantIds.forEach(participantId => {
            messageCache.invalidateUser(participantId);
          });
          
          logger.info(`Group conversation ${conversationId} deleted by last admin/creator ${userId}`);
          return { action: 'deleted' };
        } else {
          // Regular leave group
          await this.messageRepository.softDeleteParticipant(conversationId, userId);
          messageCache.invalidateUser(userId);
          logger.info(`User ${userId} left group conversation ${conversationId}`);
          return { action: 'left' };
        }
      }

      throw new Error('Invalid conversation type');
    } catch (error) {
      logger.error('Error deleting conversation:', error);
      throw error;
    }
  }
} 