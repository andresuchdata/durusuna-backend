import { MessageRepository } from '../repositories/messageRepository';
import { AuthenticatedUser } from '../types/user';
import messageCache from '../utils/messageCache';
import logger from '../utils/logger';
import { safeJsonParse } from '../utils/json';
import {
  MessageWithSender,
  SendMessageRequest,
  SendMessageResponse,
  MessageSearchParams,
  MessageSearchResponse
} from '../types/message';
import { getSocketInstance } from './socketService';

export class MessageService {
  constructor(private messageRepository: MessageRepository) {}

  async deleteMessage(
    messageId: string,
    currentUser: AuthenticatedUser
  ): Promise<{ success: boolean; message?: string }> {
    try {
      // Check if message exists and belongs to user
      const message = await this.messageRepository.findMessageForDeletion(messageId, currentUser.id);
      
      if (!message) {
        return { success: false, message: 'Message not found or access denied' };
      }

      // Delete the message
      const deleted = await this.messageRepository.deleteMessage(messageId, currentUser.id);
      
      if (!deleted) {
        return { success: false, message: 'Failed to delete message' };
      }

      // Update cache - remove message
      try {
        messageCache.removeMessage(message.conversation_id, messageId);
        
        // Invalidate conversation lists for participants
        const participantUserIds = await this.messageRepository.findParticipantUserIds(message.conversation_id);
        participantUserIds.forEach(userId => {
          messageCache.invalidateUser(userId);
        });
      } catch (cacheError) {
        logger.error('Error updating cache after message deletion:', cacheError);
      }

      // Emit real-time deletion event
      try {
        const io = getSocketInstance();
        if (io) {
          io.emitMessageDeleted(messageId, message.conversation_id);
          logger.info('✅ MessageService: Emitted message deletion event', {
            messageId,
            conversationId: message.conversation_id
          });
        }
      } catch (socketError) {
        logger.error('❌ MessageService: Error emitting deletion event:', socketError);
      }

      return { success: true };
    } catch (error) {
      logger.error('Error deleting message:', error);
      return { success: false, message: 'Internal server error' };
    }
  }

  async deleteBatchMessages(
    messageIds: string[],
    currentUser: AuthenticatedUser
  ): Promise<{ deletedCount: number; failedCount: number; message?: string }> {
    try {
      if (!messageIds || messageIds.length === 0) {
        return { deletedCount: 0, failedCount: 0, message: 'No message IDs provided' };
      }

      // Limit batch size for performance
      if (messageIds.length > 50) {
        return { deletedCount: 0, failedCount: messageIds.length, message: 'Too many messages (max 50)' };
      }

      const result = await this.messageRepository.deleteBatchMessages(messageIds, currentUser.id);
      
      // Get conversation IDs for cache invalidation
      const conversationIds = new Set<string>();
      
      // For successful deletions, emit real-time events and update cache
      if (result.deletedCount > 0) {
        try {
          const validMessageIds = messageIds.filter(id => !result.failedIds.includes(id));
          
          // Get conversation IDs for the successfully deleted messages
          for (const messageId of validMessageIds) {
            // Note: We'd need to modify this to get conversation IDs efficiently
            // For now, we'll invalidate all user conversations
          }

          // Update cache - invalidate conversations for user
          messageCache.invalidateUser(currentUser.id);

          // Emit real-time batch deletion event
          const io = getSocketInstance();
          if (io) {
            io.emitBatchMessagesDeleted(validMessageIds);
            logger.info('✅ MessageService: Emitted batch deletion event', {
              deletedCount: result.deletedCount,
              messageIds: validMessageIds.slice(0, 5) // Log first 5 for brevity
            });
          }
        } catch (cacheError) {
          logger.error('Error updating cache after batch deletion:', cacheError);
        }
      }

      return {
        deletedCount: result.deletedCount,
        failedCount: result.failedIds.length
      };
    } catch (error) {
      logger.error('Error deleting batch messages:', error);
      return { 
        deletedCount: 0, 
        failedCount: messageIds.length, 
        message: 'Internal server error' 
      };
    }
  }

  async sendMessage(
    messageData: SendMessageRequest,
    currentUser: AuthenticatedUser
  ): Promise<SendMessageResponse> {
    const {
      conversation_id,
      receiver_id,
      content,
      message_type = 'text',
      reply_to_id,
      metadata,
      client_message_id
    } = messageData;

    let conversationId = conversation_id;
    let receiverId = receiver_id;

    // If conversation_id is provided, verify user is a participant
    if (conversationId) {
      const participant = await this.messageRepository.findConversationParticipant(conversationId, currentUser.id);

      if (!participant) {
        throw new Error('Not a participant in this conversation');
      }

      // For direct conversations, get the receiver_id
      const conversation = await this.messageRepository.findConversationById(conversationId);
      if (!conversation) {
        throw new Error('Conversation not found');
      }
      
      if (conversation.type === 'direct') {
        const participants = await this.messageRepository.findParticipantsByConversationId(conversationId);
        const otherParticipant = participants.find(p => p.id !== currentUser.id);
        
        if (otherParticipant) {
          receiverId = otherParticipant.id;
        }
      } else {
        // For group messages, receiver_id should be null
        receiverId = undefined;
      }
    } 
    // If only receiver_id is provided, find or create direct conversation
    else if (receiverId) {
      // Verify receiver exists and is active
      const receiver = await this.messageRepository.findUserById(receiverId);

      if (!receiver) {
        throw new Error('Receiver not found');
      }

      // Find existing direct conversation between these users
      const existingConversation = await this.messageRepository.findDirectConversation(currentUser.id, receiverId);

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new direct conversation
        conversationId = await this.messageRepository.createConversation({
          type: 'direct',
          created_by: currentUser.id
        });

        // Add participants
        await this.messageRepository.addParticipants(conversationId, [currentUser.id, receiverId]);
      }
    } else {
      throw new Error('Either conversation_id or receiver_id is required');
    }

    // At this point, conversationId should always be defined
    if (!conversationId) {
      throw new Error('Failed to determine conversation ID');
    }

    // Verify reply-to message exists if provided
    if (reply_to_id) {
      const replyMessage = await this.messageRepository.findReplyToMessage(reply_to_id, conversationId);

      if (!replyMessage) {
        throw new Error('Invalid reply-to message');
      }
    }

    // Idempotency by client_message_id if provided
    let message: any | null = null;
    if (client_message_id) {
      message = await this.messageRepository.findMessageByClientMessageId(client_message_id, conversationId);
    }

    if (!message) {
      message = await this.messageRepository.createMessage({
        conversation_id: conversationId,
        sender_id: currentUser.id,
        receiver_id: receiverId || undefined,
        content: content || undefined,
        message_type,
        reply_to_id: reply_to_id || undefined,
        metadata,
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
      // Convert MessageWithSender to MessageData format for cache
      const cacheMessage = {
        id: formattedMessage.id,
        conversation_id: formattedMessage.conversation_id,
        sender_id: formattedMessage.sender_id,
        content: formattedMessage.content,
        message_type: formattedMessage.message_type,
        reply_to_id: formattedMessage.reply_to_id,
        metadata: formattedMessage.metadata,
        sent_at: formattedMessage.created_at,
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
        logger.info('✅ MessageService: Emitted real-time message', {
          conversationId,
          messageId: formattedMessage.id,
          content: formattedMessage.content
        });
      } else {
        logger.warn('⚠️ MessageService: Socket instance not available for real-time emission');
      }
    } catch (socketError) {
      logger.error('❌ MessageService: Error emitting real-time message:', socketError);
    }

    return {
      message: formattedMessage,
      conversation_id: conversationId
    };
  }

  async searchMessages(
    searchParams: MessageSearchParams,
    currentUser: AuthenticatedUser,
    page: number = 1,
    limit: number = 20
  ): Promise<MessageSearchResponse> {
    const { q } = searchParams;

    if (!q || q.trim().length < 2) {
      throw new Error('Search query must be at least 2 characters long');
    }

    const messages = await this.messageRepository.searchMessages(currentUser.id, searchParams, page, limit);

    const formattedMessages: MessageWithSender[] = messages.map(msg => ({
      id: msg.id,
      conversation_id: msg.conversation_id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      message_type: msg.message_type,
      reply_to_id: msg.reply_to_id,
      is_read: msg.is_read,
      is_edited: msg.is_edited,
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
        email: '',
        avatar_url: msg.sender_avatar,
        user_type: 'student',
        role: 'user',
        is_active: true
      },
      is_from_me: msg.sender_id === currentUser.id
    }));

    return {
      messages: formattedMessages,
      pagination: {
        page,
        limit,
        hasMore: messages.length === limit
      },
      query: q.trim()
    };
  }
} 