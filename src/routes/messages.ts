import express, { Request, Response } from 'express';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate, messageSchema } from '../utils/validation';
import logger from '../utils/logger';
import messageCache from '../utils/messageCache';
import { AuthenticatedRequest } from '../types/auth';
import {
  MessageWithSender,
  ConversationWithDetails,
  ConversationResponse,
  ConversationMessagesResponse,
  LoadMoreMessagesResponse,
  SendMessageRequest,
  SendMessageResponse,
  MessageSearchParams,
  MessageSearchResponse,
  ConversationPaginationParams,
  MessagePaginationResponse,
  TypingUser
} from '../types/message';

const router = express.Router();

// Helper function to safely parse JSON
const safeJsonParse = (jsonData: any, fallback: any = null): any => {
  try {
    // If it's already an object/array, return it as-is
    if (typeof jsonData === 'object' && jsonData !== null) {
      return jsonData;
    }
    // If it's a string, try to parse it
    if (typeof jsonData === 'string' && jsonData.trim()) {
      return JSON.parse(jsonData);
    }
    return fallback;
  } catch (error) {
    logger.warn('Failed to parse JSON:', { jsonData, error: (error as Error).message });
    return fallback;
  }
};

/**
 * @route GET /api/messages/conversations
 * @desc Get all conversations for the current user (optimized with caching)
 * @access Private
 */
router.get('/conversations', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { page = '1', limit = '15' } = req.query as { page?: string; limit?: string };
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = Math.min(parseInt(limit), 25);

    // Check cache first for the first page
    if (parseInt(page) === 1) {
      const cachedConversations = messageCache.getUserConversations(authenticatedReq.user.id);
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
        return res.json(response);
      }
    }

    // Get conversations with optimized query
    const conversations = await db('conversations')
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
      .where('participant.user_id', authenticatedReq.user.id)
      .where('participant.is_active', true)
      .where('conversations.is_active', true)
      .orderBy('conversations.last_message_at', 'desc')
      .limit(pageLimit)
      .offset(offset);

    if (conversations.length === 0) {
      const response: ConversationResponse = {
        conversations: [],
        pagination: {
          page: parseInt(page),
          limit: pageLimit,
          hasMore: false
        }
      };
      return res.json(response);
    }

    // Get participants for all conversations in a single query
    const conversationIds = conversations.map(c => c.id);
    const allParticipants = await db('conversation_participants')
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

    // Group participants by conversation
    const participantsByConversation: Record<string, any[]> = {};
    allParticipants.forEach(participant => {
      if (!participantsByConversation[participant.conversation_id]) {
        participantsByConversation[participant.conversation_id] = [];
      }
      participantsByConversation[participant.conversation_id].push(participant);
    });

    // Format response efficiently
    const formattedConversations: ConversationWithDetails[] = conversations.map(conv => {
      const participants = participantsByConversation[conv.id] || [];
      const otherParticipants = participants.filter(p => p.id !== authenticatedReq.user.id);
      
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
          is_from_me: conv.last_message_sender_id === authenticatedReq.user.id
        } : undefined,
        unread_count: parseInt(conv.unread_count) || 0,
        last_activity: conv.last_message_at
      };
    });

    // Cache the results for the first page
    if (parseInt(page) === 1) {
      messageCache.setUserConversations(authenticatedReq.user.id, formattedConversations as unknown as any[]);
    }

    const response: ConversationResponse = {
      conversations: formattedConversations,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        hasMore: formattedConversations.length === pageLimit
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * @route GET /api/messages/conversation/:conversationId
 * @desc Get messages for a specific conversation (optimized for smooth loading)
 * @access Private
 */
router.get('/conversation/:conversationId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const { 
      page = '1', 
      limit = '25',
      cursor,
      loadDirection = 'before'
    } = req.query as ConversationPaginationParams & { page?: string; limit?: string };
    
    const pageLimit = Math.min(parseInt(limit), 50);

    // Verify conversation exists and user is a participant
    const participant = await db('conversation_participants')
      .join('conversations', 'conversation_participants.conversation_id', 'conversations.id')
      .where('conversation_participants.conversation_id', conversationId)
      .where('conversation_participants.user_id', authenticatedReq.user.id)
      .where('conversation_participants.is_active', true)
      .where('conversations.is_active', true)
      .select('conversations.*', 'conversation_participants.unread_count')
      .first();

    if (!participant) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    // Build optimized query for messages
    let messagesQuery = db('messages')
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

    // Use cursor-based pagination for better performance on large conversations
    if (cursor) {
      const cursorDate = new Date(cursor);
      if (loadDirection === 'before') {
        messagesQuery = messagesQuery.where('messages.created_at', '<', cursorDate);
      } else {
        messagesQuery = messagesQuery.where('messages.created_at', '>', cursorDate);
      }
    }

    // Always order by created_at with ID as tiebreaker for consistency
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

    // Apply limit for pagination
    const messages = await messagesQuery.limit(pageLimit + 1);

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
      is_from_me: Boolean(msg.sender_id === authenticatedReq.user.id)
    }));

    // Get conversation details and participants
    const [conversation, participants] = await Promise.all([
      db('conversations').where('id', conversationId).first(),
      db('conversation_participants')
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
        )
    ]);

    // For direct chats, identify the other user
    const otherUser = conversation.type === 'direct' 
      ? participants.find(p => p.id !== authenticatedReq.user.id)
      : null;

    // Auto-mark conversation as read when user opens it
    if (participant.unread_count > 0) {
      db('conversation_participants')
        .where('conversation_id', conversationId)
        .where('user_id', authenticatedReq.user.id)
        .update({
          unread_count: 0,
          last_read_at: new Date(),
          updated_at: new Date()
        })
        .catch(error => logger.error('Error updating unread count:', error));
    }

    const pagination: MessagePaginationResponse = {
      hasMore,
      nextCursor: hasMore ? nextCursor : undefined,
      prevCursor,
      limit: pageLimit,
      loadDirection
    };

    const response: ConversationMessagesResponse = {
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

    res.json(response);

  } catch (error) {
    logger.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * @route GET /api/messages/conversation/:conversationId/load-more
 * @desc Load more messages for infinite scroll (optimized for performance)
 * @access Private
 */
router.get('/conversation/:conversationId/load-more', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const { 
      cursor,
      limit = '20',
      direction = 'before'
    } = req.query as { cursor?: string; limit?: string; direction?: 'before' | 'after' };

    if (!cursor) {
      return res.status(400).json({ error: 'Cursor is required for loading more messages' });
    }

    const pageLimit = Math.min(parseInt(limit), 30);

    // Verify user is participant (quick check)
    const isParticipant = await db('conversation_participants')
      .where('conversation_id', conversationId)
      .where('user_id', authenticatedReq.user.id)
      .where('is_active', true)
      .first();

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Build optimized query for loading more messages
    const cursorDate = new Date(cursor);
    let messagesQuery = db('messages')
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

    // Get messages with +1 to check if there are more
    const messages = await messagesQuery.limit(pageLimit + 1);

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
      receiver_id: null,
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
      is_from_me: Boolean(msg.sender_id === authenticatedReq.user.id)
    }));

    const response: LoadMoreMessagesResponse = {
      messages: formattedMessages,
      pagination: {
        hasMore,
        nextCursor: hasMore ? nextCursor : undefined,
        limit: pageLimit,
        loadDirection: direction
      }
    };

    res.json(response);

  } catch (error) {
    logger.error('Error loading more messages:', error);
    res.status(500).json({ error: 'Failed to load more messages' });
  }
});

/**
 * @route POST /api/messages/send
 * @desc Send a new message
 * @access Private
 */
router.post('/send', authenticate, validate(messageSchema), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const {
      conversation_id,
      receiver_id,
      content,
      message_type = 'text',
      reply_to_id,
      metadata
    }: SendMessageRequest = req.body;

    let conversationId = conversation_id;
    let receiverId = receiver_id;

    // If conversation_id is provided, verify user is a participant
    if (conversationId) {
      const participant = await db('conversation_participants')
        .where('conversation_id', conversationId)
        .where('user_id', authenticatedReq.user.id)
        .where('is_active', true)
        .first();

      if (!participant) {
        return res.status(403).json({ error: 'Not a participant in this conversation' });
      }

      // For direct conversations, get the receiver_id
      const conversation = await db('conversations').where('id', conversationId).first();
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' });
      }
      if (conversation.type === 'direct') {
        const otherParticipant = await db('conversation_participants')
          .where('conversation_id', conversationId)
          .where('user_id', '!=', authenticatedReq.user.id)
          .where('is_active', true)
          .first();
        
        if (otherParticipant) {
          receiverId = otherParticipant.user_id;
        }
      } else {
        // For group messages, receiver_id should be null
        receiverId = undefined;
      }
    } 
    // If only receiver_id is provided, find or create direct conversation
    else if (receiverId) {
      // Verify receiver exists and is active
      const receiver = await db('users')
        .where('id', receiverId)
        .where('is_active', true)
        .first();

      if (!receiver) {
        return res.status(404).json({ error: 'Receiver not found' });
      }

      // Find existing direct conversation between these users
      const existingConversation = await db('conversations')
        .select('conversations.id')
        .join('conversation_participants as p1', 'conversations.id', 'p1.conversation_id')
        .join('conversation_participants as p2', 'conversations.id', 'p2.conversation_id')
        .where('conversations.type', 'direct')
        .where('p1.user_id', authenticatedReq.user.id)
        .where('p2.user_id', receiverId)
        .where('p1.is_active', true)
        .where('p2.is_active', true)
        .first();

      if (existingConversation) {
        conversationId = existingConversation.id;
      } else {
        // Create new direct conversation
        const [newConversation] = await db('conversations')
          .insert({
            type: 'direct',
            created_by: authenticatedReq.user.id,
            is_active: true,
            created_at: new Date(),
            updated_at: new Date()
          })
          .returning('*');

        conversationId = newConversation.id;

        // Add participants
        await db('conversation_participants').insert([
          {
            conversation_id: conversationId,
            user_id: authenticatedReq.user.id,
            joined_at: new Date(),
            is_active: true,
            role: 'member'
          },
          {
            conversation_id: conversationId,
            user_id: receiverId,
            joined_at: new Date(),
            is_active: true,
            role: 'member'
          }
        ]);
      }
    } else {
      return res.status(400).json({ error: 'Either conversation_id or receiver_id is required' });
    }

    // Verify reply-to message exists if provided
    if (reply_to_id) {
      const replyMessage = await db('messages')
        .where('id', reply_to_id)
        .where('conversation_id', conversationId)
        .first();

      if (!replyMessage) {
        return res.status(400).json({ error: 'Invalid reply-to message' });
      }
    }

    // Create message
    const [message] = await db('messages')
      .insert({
        conversation_id: conversationId,
        sender_id: authenticatedReq.user.id,
        receiver_id: receiverId || null,
        content: content || null,
        message_type,
        reply_to_id: reply_to_id || null,
        metadata: metadata ? JSON.stringify(metadata) : null,
        is_read: false,
        is_edited: false,
        is_deleted: false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');

    // Get complete message data with sender info
    const completeMessage = await db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .where('messages.id', message.id)
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

    // Update conversation's last message info
    await db('conversations')
      .where('id', conversationId)
      .update({
        last_message_id: message.id,
        last_message_at: message.created_at,
        updated_at: new Date()
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

    const response: SendMessageResponse = {
      message: formattedMessage,
      conversation_id: conversationId
    };

    res.status(201).json(response);

    // Update cache with new message
    try {
      messageCache.addMessage(conversationId, formattedMessage);
      // Invalidate conversation lists for participants since last message changed
      const participants = await db('conversation_participants')
        .where('conversation_id', conversationId)
        .where('is_active', true)
        .select('user_id');
      
      participants.forEach(p => {
        messageCache.invalidateUser(p.user_id);
      });
    } catch (cacheError) {
      logger.error('Error updating message cache:', cacheError);
    }

  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @route PUT /api/messages/conversation/:conversationId/mark-read
 * @desc Mark all messages in a conversation as read (reset unread count)
 * @access Private
 */
router.put('/conversation/:conversationId/mark-read', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;

    // Verify conversation exists and user is a participant
    const participant = await db('conversation_participants')
      .join('conversations', 'conversation_participants.conversation_id', 'conversations.id')
      .where('conversation_participants.conversation_id', conversationId)
      .where('conversation_participants.user_id', authenticatedReq.user.id)
      .where('conversation_participants.is_active', true)
      .where('conversations.is_active', true)
      .select('conversation_participants.*')
      .first();

    if (!participant) {
      return res.status(404).json({ error: 'Conversation not found or access denied' });
    }

    // Reset unread count for this user in this conversation
    await db('conversation_participants')
      .where('conversation_id', conversationId)
      .where('user_id', authenticatedReq.user.id)
      .update({
        unread_count: 0,
        updated_at: new Date()
      });

    // Also mark individual messages as read (optional, for consistency)
    await db('messages')
      .where('conversation_id', conversationId)
      .where('receiver_id', authenticatedReq.user.id)
      .where('is_read', false)
      .where('is_deleted', false)
      .update({
        is_read: true,
        read_at: new Date(),
        read_status: 'read',
        updated_at: new Date()
      });

    res.json({
      message: 'Conversation marked as read',
      conversation_id: conversationId
    });

  } catch (error) {
    logger.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

/**
 * @route GET /api/messages/search
 * @desc Search messages
 * @access Private
 */
router.get('/search', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { q, user_id, message_type, page = '1', limit = '20' } = req.query as MessageSearchParams & { page?: string; limit?: string };
    const offset = (parseInt(page) - 1) * parseInt(limit);

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Search query must be at least 2 characters long' 
      });
    }

    let query = db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
      .where(function() {
        this.where('messages.sender_id', authenticatedReq.user.id)
            .orWhere('messages.receiver_id', authenticatedReq.user.id);
      })
      .where('messages.is_deleted', false)
      .where('messages.content', 'ilike', `%${q.trim()}%`);

    if (user_id) {
      query = query.where(function() {
        this.where({
          'messages.sender_id': user_id,
          'messages.receiver_id': authenticatedReq.user.id
        }).orWhere({
          'messages.sender_id': authenticatedReq.user.id,
          'messages.receiver_id': user_id
        });
      });
    }

    if (message_type) {
      query = query.where('messages.message_type', message_type);
    }

    const messages = await query
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
      .limit(parseInt(limit))
      .offset(offset);

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
      is_from_me: msg.sender_id === authenticatedReq.user.id
    }));

    const response: MessageSearchResponse = {
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      },
      query: q.trim()
    };

    res.json(response);

  } catch (error) {
    logger.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

export default router; 