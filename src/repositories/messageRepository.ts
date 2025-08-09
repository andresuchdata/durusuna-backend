import { Knex } from 'knex';
import { 
  Message, 
  MessageWithSender, 
  Conversation, 
  ConversationWithDetails,
  ConversationParticipant,
  SendMessageRequest,
  MessageSearchParams,
  ConversationPaginationParams
} from '../types/message';

export interface CreateConversationData {
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
}

export interface UpdateConversationData {
  name?: string;
  description?: string;
  avatar_url?: string;
  last_message_id?: string;
  last_message_at?: Date;
}

export interface CreateMessageData {
  conversation_id: string;
  sender_id: string;
  receiver_id?: string;
  content?: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
  reply_to_id?: string;
  metadata?: Record<string, any>;
  client_message_id?: string; // client-generated id for idempotency
}

export interface MessageQueryOptions {
  page?: number;
  limit?: number;
  cursor?: string;
  loadDirection?: 'before' | 'after';
}

export class MessageRepository {
  constructor(private db: Knex) {}

  // Message deletion methods
  async deleteMessage(messageId: string, userId: string): Promise<boolean> {
    const result = await this.db('messages')
      .where('id', messageId)
      .andWhere('sender_id', userId) // Only allow users to delete their own messages
      .andWhere('is_deleted', false)
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date()
      });

    return result > 0;
  }

  async deleteBatchMessages(messageIds: string[], userId: string): Promise<{ deletedCount: number; failedIds: string[] }> {
    // Get messages that belong to the user and aren't already deleted
    const validMessages = await this.db('messages')
      .select('id')
      .whereIn('id', messageIds)
      .andWhere('sender_id', userId)
      .andWhere('is_deleted', false);

    const validMessageIds = validMessages.map(m => m.id);
    const failedIds = messageIds.filter(id => !validMessageIds.includes(id));

    if (validMessageIds.length === 0) {
      return { deletedCount: 0, failedIds };
    }

    const deletedCount = await this.db('messages')
      .whereIn('id', validMessageIds)
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date()
      });

    return { deletedCount, failedIds };
  }

  async findMessageForDeletion(messageId: string, userId: string): Promise<{ id: string; conversation_id: string; sender_id: string } | null> {
    const message = await this.db('messages')
      .select('id', 'conversation_id', 'sender_id')
      .where('id', messageId)
      .andWhere('sender_id', userId)
      .andWhere('is_deleted', false)
      .first();

    return message || null;
  }

  // Conversation methods
  async findConversationsByUserId(userId: string, options: MessageQueryOptions = {}): Promise<any[]> {
    const { page = 1, limit = 15 } = options;
    const offset = (page - 1) * limit;
    const pageLimit = Math.min(limit, 25);

    return await this.db('conversations')
      .select(
        'conversations.id',
        'conversations.type',
        'conversations.name',
        'conversations.avatar_url as conversation_avatar',
        'conversations.last_message_at',
        'conversations.created_at as conversation_created_at',
        'last_msg.content as last_message_content',
        'last_msg.message_type as last_message_type',
        'last_msg.sender_id as last_message_sender_id',
        'last_msg.created_at as last_message_created_at',
        'participant.unread_count'
      )
      .join('conversation_participants as participant', 'conversations.id', 'participant.conversation_id')
      .leftJoin('messages as last_msg', 'conversations.last_message_id', 'last_msg.id')
      .where('participant.user_id', userId)
      .where('participant.is_active', true)
      .where('conversations.is_active', true)
      .orderBy('conversations.last_message_at', 'desc')
      .limit(pageLimit)
      .offset(offset);
  }

  async findConversationById(conversationId: string): Promise<Conversation | null> {
    const conversation = await this.db('conversations')
      .where('id', conversationId)
      .where('is_active', true)
      .first();
    
    return conversation || null;
  }

  async findConversationParticipant(conversationId: string, userId: string): Promise<any | null> {
    return await this.db('conversation_participants')
      .join('conversations', 'conversation_participants.conversation_id', 'conversations.id')
      .where('conversation_participants.conversation_id', conversationId)
      .where('conversation_participants.user_id', userId)
      .where('conversation_participants.is_active', true)
      .where('conversations.is_active', true)
      .select('conversations.*', 'conversation_participants.unread_count')
      .first();
  }

  async findParticipantsByConversationIds(conversationIds: string[]): Promise<any[]> {
    return await this.db('conversation_participants')
      .join('users', 'conversation_participants.user_id', 'users.id')
      .whereIn('conversation_participants.conversation_id', conversationIds)
      .where('conversation_participants.is_active', true)
      .where('users.is_active', true)
      .select(
        'conversation_participants.conversation_id',
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.avatar_url',
        'users.user_type'
      );
  }

  async findParticipantsByConversationId(conversationId: string): Promise<any[]> {
    return await this.db('conversation_participants')
      .join('users', 'conversation_participants.user_id', 'users.id')
      .where('conversation_participants.conversation_id', conversationId)
      .where('conversation_participants.is_active', true)
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.email',
        'users.avatar_url',
        'users.user_type',
        'users.role',
        'users.is_active',
        'users.created_at',
        'users.updated_at'
      );
  }

  async findDirectConversation(userId1: string, userId2: string): Promise<any | null> {
    return await this.db('conversations')
      .select('conversations.id')
      .join('conversation_participants as p1', 'conversations.id', 'p1.conversation_id')
      .join('conversation_participants as p2', 'conversations.id', 'p2.conversation_id')
      .where('conversations.type', 'direct')
      .where('p1.user_id', userId1)
      .where('p2.user_id', userId2)
      .where('p1.is_active', true)
      .where('p2.is_active', true)
      .first();
  }

  async createConversation(data: CreateConversationData): Promise<string> {
    const [conversation] = await this.db('conversations')
      .insert({
        ...data,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('id');

    return conversation.id;
  }

  async addParticipants(conversationId: string, userIds: string[]): Promise<void> {
    const participants = userIds.map(userId => ({
      conversation_id: conversationId,
      user_id: userId,
      joined_at: new Date(),
      is_active: true,
      role: 'member'
    }));

    await this.db('conversation_participants').insert(participants);
  }

  async updateConversation(conversationId: string, data: UpdateConversationData): Promise<void> {
    await this.db('conversations')
      .where('id', conversationId)
      .update({
        ...data,
        updated_at: new Date()
      });
  }

  // Message methods
  async findMessagesByConversationId(
    conversationId: string, 
    options: MessageQueryOptions = {}
  ): Promise<any[]> {
    const { limit = 25, cursor, loadDirection = 'before' } = options;
    const pageLimit = Math.min(limit, 50);

    let messagesQuery = this.db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .where('messages.conversation_id', conversationId)
      .where('messages.is_deleted', false)
      .select(
        'messages.id',
        'messages.conversation_id',
        'messages.sender_id',
        'messages.receiver_id',
        'messages.content',
        'messages.message_type',
        'messages.reply_to_id',
        'messages.is_read',
        'messages.is_edited',
        'messages.edited_at',
        'messages.read_status',
        'messages.reactions',
        'messages.created_at',
        'messages.updated_at',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.email as sender_email',
        'sender.avatar_url as sender_avatar',
        'sender.user_type as sender_user_type',
        'sender.role as sender_role',
        'sender.is_active as sender_is_active'
      );

    // Use cursor-based pagination
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (loadDirection === 'before') {
        messagesQuery = messagesQuery.where('messages.created_at', '<', cursorDate);
      } else {
        messagesQuery = messagesQuery.where('messages.created_at', '>', cursorDate);
      }
    }

    // Order by created_at with ID as tiebreaker
    if (loadDirection === 'after') {
      messagesQuery = messagesQuery.orderBy([
        { column: 'messages.created_at', order: 'asc' },
        { column: 'messages.id', order: 'asc' }
      ]);
    } else {
      messagesQuery = messagesQuery.orderBy([
        { column: 'messages.created_at', order: 'desc' },
        { column: 'messages.id', order: 'desc' }
      ]);
    }

    return await messagesQuery.limit(pageLimit + 1);
  }

  async findLoadMoreMessages(
    conversationId: string,
    cursor: string,
    direction: 'before' | 'after' = 'before',
    limit: number = 20
  ): Promise<any[]> {
    const pageLimit = Math.min(limit, 30);
    const cursorDate = new Date(cursor);

    let messagesQuery = this.db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .where('messages.conversation_id', conversationId)
      .where('messages.is_deleted', false)
      .select(
        'messages.id',
        'messages.sender_id',
        'messages.content',
        'messages.message_type',
        'messages.reply_to_id',
        'messages.is_read',
        'messages.is_edited',
        'messages.edited_at',
        'messages.read_status',
        'messages.reactions',
        'messages.created_at',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.avatar_url as sender_avatar',
        'sender.user_type as sender_user_type'
      );

    // Apply cursor filtering
    if (direction === 'before') {
      messagesQuery = messagesQuery
        .where('messages.created_at', '<', cursorDate)
        .orderBy([
          { column: 'messages.created_at', order: 'desc' },
          { column: 'messages.id', order: 'desc' }
        ]);
    } else {
      messagesQuery = messagesQuery
        .where('messages.created_at', '>', cursorDate)
        .orderBy([
          { column: 'messages.created_at', order: 'asc' },
          { column: 'messages.id', order: 'asc' }
        ]);
    }

    return await messagesQuery.limit(pageLimit + 1);
  }

  async createMessage(data: CreateMessageData): Promise<any> {
    const [message] = await this.db('messages')
      .insert({
        ...data,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        is_read: false,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    return message;
  }

  async findMessageByClientMessageId(clientMessageId: string, conversationId: string): Promise<any | null> {
    const msg = await this.db('messages')
      .where('client_message_id', clientMessageId)
      .andWhere('conversation_id', conversationId)
      .first();
    return msg || null;
  }

  async findMessageWithSender(messageId: string): Promise<any | null> {
    return await this.db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .where('messages.id', messageId)
      .select(
        'messages.*',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.email as sender_email',
        'sender.avatar_url as sender_avatar',
        'sender.user_type as sender_user_type',
        'sender.role as sender_role',
        'sender.is_active as sender_is_active'
      )
      .first();
  }

  async findReplyToMessage(replyToId: string, conversationId: string): Promise<any | null> {
    return await this.db('messages')
      .where('id', replyToId)
      .where('conversation_id', conversationId)
      .first();
  }

  async searchMessages(
    userId: string, 
    searchParams: MessageSearchParams,
    page: number = 1,
    limit: number = 20
  ): Promise<any[]> {
    const { q, user_id, message_type } = searchParams;
    const offset = (page - 1) * limit;

    let query = this.db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
      .where(function() {
        this.where('messages.sender_id', userId)
            .orWhere('messages.receiver_id', userId);
      })
      .where('messages.is_deleted', false);

    if (q && q.trim().length >= 2) {
      query = query.where('messages.content', 'ilike', `%${q.trim()}%`);
    }

    if (user_id) {
      query = query.where(function() {
        this.where({
          'messages.sender_id': user_id,
          'messages.receiver_id': userId
        }).orWhere({
          'messages.sender_id': userId,
          'messages.receiver_id': user_id
        });
      });
    }

    if (message_type) {
      query = query.where('messages.message_type', message_type);
    }

    return await query
      .select(
        'messages.*',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.avatar_url as sender_avatar',
        'receiver.first_name as receiver_first_name',
        'receiver.last_name as receiver_last_name',
        'receiver.avatar_url as receiver_avatar'
      )
      .orderBy('messages.created_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  // Read status methods
  async markConversationAsRead(conversationId: string, userId: string): Promise<void> {
    await this.db('conversation_participants')
      .where('conversation_id', conversationId)
      .where('user_id', userId)
      .update({
        unread_count: 0,
        updated_at: new Date()
      });
  }

  async markMessagesAsRead(conversationId: string, userId: string): Promise<void> {
    await this.db('messages')
      .where('conversation_id', conversationId)
      .where('receiver_id', userId)
      .where('is_read', false)
      .where('is_deleted', false)
      .update({
        is_read: true,
        read_at: new Date(),
        read_status: 'read',
        updated_at: new Date()
      });
  }

  // User methods
  async findUserById(userId: string): Promise<any | null> {
    return await this.db('users')
      .where('id', userId)
      .where('is_active', true)
      .first();
  }

  // Participant methods for cache invalidation
  async findParticipantUserIds(conversationId: string): Promise<string[]> {
    const participants = await this.db('conversation_participants')
      .where('conversation_id', conversationId)
      .where('is_active', true)
      .select('user_id');
    
    return participants.map(p => p.user_id);
  }
} 