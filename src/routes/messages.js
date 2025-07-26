const express = require('express');
const db = require('../config/database');
const { authenticate: auth } = require('../middleware/auth');
const { validate, messageSchema } = require('../utils/validation');
const logger = require('../utils/logger');
const messageCache = require('../utils/messageCache');

const router = express.Router();

// Helper function to safely parse JSON
const safeJsonParse = (jsonData, fallback = null) => {
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
    logger.warn('Failed to parse JSON:', { jsonData, error: error.message });
    return fallback;
  }
};

/**
 * @route GET /api/messages/conversations
 * @desc Get all conversations for the current user (optimized with caching)
 * @access Private
 */
router.get('/conversations', auth, async (req, res) => {
  try {
    const { page = 1, limit = 15 } = req.query;
    const offset = (page - 1) * limit;
    const pageLimit = Math.min(parseInt(limit), 25);

    // Check cache first for the first page
    if (page == 1) {
      const cachedConversations = messageCache.getUserConversations(req.user.id);
      if (cachedConversations) {
        return res.json({
          conversations: cachedConversations.slice(0, pageLimit),
          pagination: {
            page: 1,
            limit: pageLimit,
            hasMore: cachedConversations.length > pageLimit
          },
          cached: true
        });
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
      .where('participant.user_id', req.user.id)
      .where('participant.is_active', true)
      .where('conversations.is_active', true)
      .orderBy('conversations.last_message_at', 'desc')
      .limit(pageLimit)
      .offset(offset);

    if (conversations.length === 0) {
      return res.json({
        conversations: [],
        pagination: {
          page: parseInt(page),
          limit: pageLimit,
          hasMore: false
        }
      });
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
    const participantsByConversation = {};
    allParticipants.forEach(participant => {
      if (!participantsByConversation[participant.conversation_id]) {
        participantsByConversation[participant.conversation_id] = [];
      }
      participantsByConversation[participant.conversation_id].push(participant);
    });

    // Format response efficiently
    const formattedConversations = conversations.map(conv => {
      const participants = participantsByConversation[conv.id] || [];
      const otherParticipants = participants.filter(p => p.id !== req.user.id);
      
      const otherUser = conv.type === 'direct' && otherParticipants.length > 0 
        ? otherParticipants[0] 
        : null;

      return {
        id: conv.id,
        type: conv.type,
        name: conv.name,
        avatar_url: conv.conversation_avatar,
        participants: participants.map(p => ({
          id: p.id,
          first_name: p.first_name,
          last_name: p.last_name,
          avatar_url: p.avatar_url,
          user_type: p.user_type
        })),
        other_user: otherUser ? {
          id: otherUser.id,
          first_name: otherUser.first_name,
          last_name: otherUser.last_name,
          email: otherUser.email,
          avatar_url: otherUser.avatar_url,
          user_type: otherUser.user_type
        } : null,
        last_message: conv.last_message_content ? {
          content: conv.last_message_content,
          message_type: conv.last_message_type,
          created_at: conv.last_message_created_at,
          is_from_me: conv.last_message_sender_id === req.user.id
        } : null,
        unread_count: parseInt(conv.unread_count) || 0,
        last_activity: conv.last_message_at,
        created_at: conv.conversation_created_at
      };
    });

    // Cache the results for the first page
    if (page == 1) {
      messageCache.setUserConversations(req.user.id, formattedConversations);
    }

    res.json({
      conversations: formattedConversations,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        hasMore: formattedConversations.length === pageLimit
      }
    });

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
router.get('/conversation/:conversationId', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { 
      page = 1, 
      limit = 25, // Reduced from 50 to 25 for faster initial load
      cursor, // For cursor-based pagination (more efficient)
      loadDirection = 'before' // 'before' for loading older messages, 'after' for newer
    } = req.query;
    
    const pageLimit = Math.min(parseInt(limit), 50); // Cap at 50 messages max
    const pageNum = Math.max(parseInt(page), 1);

    // Verify conversation exists and user is a participant
    const participant = await db('conversation_participants')
      .join('conversations', 'conversation_participants.conversation_id', 'conversations.id')
      .where('conversation_participants.conversation_id', conversationId)
      .where('conversation_participants.user_id', req.user.id)
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
    const messages = await messagesQuery.limit(pageLimit + 1); // +1 to check if there are more

    // Check if there are more messages
    const hasMore = messages.length > pageLimit;
    if (hasMore) {
      messages.pop(); // Remove the extra message used for hasMore check
    }

    // Determine cursors for pagination
    let nextCursor = null;
    let prevCursor = null;
    
    if (messages.length > 0) {
      if (loadDirection === 'after') {
        nextCursor = messages[messages.length - 1].created_at;
        prevCursor = messages[0].created_at;
      } else {
        nextCursor = messages[0].created_at;
        prevCursor = messages[messages.length - 1].created_at;
        // For 'before' direction, reverse the array to show in chronological order
        messages.reverse();
      }
    }

    // Format messages efficiently
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      sender_id: msg.sender_id,
      receiver_id: msg.receiver_id,
      content: msg.content,
      message_type: msg.message_type,
      reply_to_id: msg.reply_to_id,
      is_read: Boolean(msg.is_read),
      is_edited: Boolean(msg.is_edited),
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
      is_from_me: Boolean(msg.sender_id === req.user.id)
    }));

    // Get conversation details and participants (cached query)
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
      ? participants.find(p => p.id !== req.user.id)
      : null;

    // Auto-mark conversation as read when user opens it
    if (participant.unread_count > 0) {
      // Update unread count asynchronously (don't wait for response)
      db('conversation_participants')
        .where('conversation_id', conversationId)
        .where('user_id', req.user.id)
        .update({
          unread_count: 0,
          last_read_at: new Date(),
          updated_at: new Date()
        })
        .catch(error => logger.error('Error updating unread count:', error));
    }

    res.json({
      messages: formattedMessages,
      conversation: {
        id: conversation.id,
        type: conversation.type,
        name: conversation.name,
        description: conversation.description,
        avatar_url: conversation.avatar_url,
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
      } : null,
      pagination: {
        hasMore,
        nextCursor: hasMore ? nextCursor : null,
        prevCursor,
        limit: pageLimit,
        loadDirection
      },
      meta: {
        total_unread: participant.unread_count,
        conversation_id: conversationId
      }
    });

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
router.get('/conversation/:conversationId/load-more', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { 
      cursor, // Required for cursor-based pagination
      limit = 20, // Smaller batches for smooth scrolling
      direction = 'before' // 'before' for older messages, 'after' for newer
    } = req.query;

    if (!cursor) {
      return res.status(400).json({ error: 'Cursor is required for loading more messages' });
    }

    const pageLimit = Math.min(parseInt(limit), 30); // Cap at 30 messages

    // Verify user is participant (quick check)
    const isParticipant = await db('conversation_participants')
      .where('conversation_id', conversationId)
      .where('user_id', req.user.id)
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
    let nextCursor = null;
    if (messages.length > 0) {
      if (direction === 'before') {
        nextCursor = messages[messages.length - 1].created_at;
        messages.reverse(); // Show in chronological order
      } else {
        nextCursor = messages[messages.length - 1].created_at;
      }
    }

    // Format messages (lightweight)
    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      sender_id: msg.sender_id,
      content: msg.content,
      message_type: msg.message_type,
      reply_to_id: msg.reply_to_id,
      is_read: Boolean(msg.is_read),
      is_edited: Boolean(msg.is_edited),
      edited_at: msg.edited_at,
      read_status: msg.read_status || 'sent',
      reactions: safeJsonParse(msg.reactions, {}),
      created_at: msg.created_at,
      sender: {
        id: msg.sender_id,
        first_name: msg.sender_first_name,
        last_name: msg.sender_last_name,
        avatar_url: msg.sender_avatar,
        user_type: msg.sender_user_type
      },
      is_from_me: Boolean(msg.sender_id === req.user.id)
    }));

    res.json({
      messages: formattedMessages,
      pagination: {
        hasMore,
        nextCursor: hasMore ? nextCursor : null,
        direction,
        limit: pageLimit
      }
    });

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
router.post('/send', auth, validate(messageSchema), async (req, res) => {
  try {
    const {
      conversation_id,
      receiver_id,
      content,
      message_type = 'text',
      reply_to_id,
      metadata
    } = req.body;

    let conversationId = conversation_id;
    let receiverId = receiver_id;

    // If conversation_id is provided, verify user is a participant
    if (conversationId) {
      const participant = await db('conversation_participants')
        .where('conversation_id', conversationId)
        .where('user_id', req.user.id)
        .where('is_active', true)
        .first();

      if (!participant) {
        return res.status(403).json({ error: 'Not a participant in this conversation' });
      }

      // For direct conversations, get the receiver_id
      const conversation = await db('conversations').where('id', conversationId).first();
      if (conversation.type === 'direct') {
        const otherParticipant = await db('conversation_participants')
          .where('conversation_id', conversationId)
          .where('user_id', '!=', req.user.id)
          .where('is_active', true)
          .first();
        
        if (otherParticipant) {
          receiverId = otherParticipant.user_id;
        }
      } else {
        // For group messages, receiver_id should be null
        receiverId = null;
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
        .where('p1.user_id', req.user.id)
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
            created_by: req.user.id,
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
            user_id: req.user.id,
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

        // Emit conversation created event
        try {
          const io = req.app.get('io');
          if (io) {
            io.emitConversationCreated(newConversation, [req.user.id, receiverId]);
            logger.info(`Emitted conversation created event for conversation ${conversationId}`);
          }
        } catch (socketError) {
          logger.error('Error emitting conversation created event:', socketError);
        }
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
        sender_id: req.user.id,
        receiver_id: receiverId, // null for group messages
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
        'messages.id',
        'messages.sender_id', 
        'messages.receiver_id',
        'messages.content',
        'messages.message_type',
        'messages.reply_to_id',
        'messages.is_read',
        'messages.is_edited',
        'messages.is_deleted',
        'messages.edited_at',
        'messages.deleted_at',
        'messages.delivered_at',
        'messages.read_at',
        'messages.read_status',
        'messages.reactions',
        'messages.created_at',
        'messages.updated_at',
        'sender.id as sender_id',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.email as sender_email',
        'sender.avatar_url as sender_avatar',
        'sender.user_type as sender_user_type',
        'sender.role as sender_role',
        'sender.is_active as sender_is_active',
        'sender.created_at as sender_created_at',
        'sender.updated_at as sender_updated_at'
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

    const formattedMessage = {
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
        is_active: Boolean(completeMessage.sender_is_active),
        created_at: completeMessage.sender_created_at,
        updated_at: completeMessage.sender_updated_at
      },
      attachments: [],
      is_from_me: true
    };

    res.status(201).json({
      message: formattedMessage,
      conversation_id: conversationId
    });

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

    // Emit real-time socket events
    try {
      const io = req.app.get('io');
      if (io) {
        // Emit new message to conversation participants
        io.emitNewMessage(formattedMessage, conversationId);
        
        // Also emit to user-specific rooms for notifications
        if (receiverId) {
          io.emitToUser(receiverId, 'message:new', {
            message: formattedMessage,
            action: 'created',
            conversationId: conversationId,
          });
        }
        
        logger.info(`Emitted new message event for conversation ${conversationId}`);
      }
    } catch (socketError) {
      logger.error('Error emitting socket event:', socketError);
      // Don't fail the request if socket emission fails
    }

  } catch (error) {
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @route PUT /api/messages/:messageId/mark-read
 * @desc Mark a message as read
 * @access Private
 */
router.put('/:messageId/mark-read', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Verify message exists and user is the receiver
    const message = await db('messages')
      .where('id', messageId)
      .where('receiver_id', req.user.id)
      .where('is_deleted', false)
      .first();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update message as read
    await db('messages')
      .where('id', messageId)
      .update({
        is_read: true,
        read_at: new Date(),
        read_status: 'read',
        updated_at: new Date()
      });

    res.json({
      message: 'Message marked as read'
    });

  } catch (error) {
    logger.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

/**
 * @route PUT /api/messages/conversation/:conversationId/mark-read
 * @desc Mark all messages in a conversation as read (reset unread count)
 * @access Private
 */
router.put('/conversation/:conversationId/mark-read', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify conversation exists and user is a participant
    const participant = await db('conversation_participants')
      .join('conversations', 'conversation_participants.conversation_id', 'conversations.id')
      .where('conversation_participants.conversation_id', conversationId)
      .where('conversation_participants.user_id', req.user.id)
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
      .where('user_id', req.user.id)
      .update({
        unread_count: 0,
        updated_at: new Date()
      });

    // Also mark individual messages as read (optional, for consistency)
    await db('messages')
      .where('conversation_id', conversationId)
      .where('receiver_id', req.user.id)
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
 * @route PUT /api/messages/:messageId
 * @desc Edit a message
 * @access Private
 */
router.put('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content is required' });
    }

    // Verify message exists and user is the sender
    const message = await db('messages')
      .where('id', messageId)
      .where('sender_id', req.user.id)
      .where('is_deleted', false)
      .first();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Check if message is too old to edit (24 hours)
    const messageAge = new Date() - new Date(message.created_at);
    const maxEditAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

    if (messageAge > maxEditAge) {
      return res.status(400).json({ 
        error: 'Message is too old to edit (24 hour limit)' 
      });
    }

    // Update message
    await db('messages')
      .where('id', messageId)
      .update({
        content: content.trim(),
        is_edited: true,
        edited_at: new Date(),
        updated_at: new Date()
      });

    // Get updated message
    const updatedMessage = await db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .where('messages.id', messageId)
      .select(
        'messages.*',
        'sender.first_name as sender_first_name',
        'sender.last_name as sender_last_name',
        'sender.avatar_url as sender_avatar'
      )
      .first();

    const formattedMessage = {
      id: updatedMessage.id,
      senderId: updatedMessage.sender_id,
      receiverId: updatedMessage.receiver_id,
      content: updatedMessage.content,
      messageType: updatedMessage.message_type,
      replyToId: updatedMessage.reply_to_id,
      isRead: updatedMessage.is_read,
      isEdited: updatedMessage.is_edited,
      editedAt: updatedMessage.edited_at,
      createdAt: updatedMessage.created_at,
      updatedAt: updatedMessage.updated_at,
      sender: {
        id: updatedMessage.sender_id,
        first_name: updatedMessage.sender_first_name,
        last_name: updatedMessage.sender_last_name,
        avatar_url: updatedMessage.sender_avatar
      },
      attachments: [],
      isFromMe: updatedMessage.sender_id === req.user.id
    };

    res.json({
      message: formattedMessage
    });

  } catch (error) {
    logger.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

/**
 * @route DELETE /api/messages/:messageId
 * @desc Delete a message (soft delete)
 * @access Private
 */
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Verify message exists and user is the sender
    const message = await db('messages')
      .where('id', messageId)
      .where('sender_id', req.user.id)
      .where('is_deleted', false)
      .first();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Soft delete message
    await db('messages')
      .where('id', messageId)
      .update({
        is_deleted: true,
        deleted_at: new Date(),
        updated_at: new Date()
      });

    res.json({
      message: 'Message deleted successfully'
    });

  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * @route GET /api/messages/search
 * @desc Search messages
 * @access Private
 */
router.get('/search', auth, async (req, res) => {
  try {
    const { q, user_id, message_type, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({ 
        error: 'Search query must be at least 2 characters long' 
      });
    }

    let query = db('messages')
      .leftJoin('users as sender', 'messages.sender_id', 'sender.id')
      .leftJoin('users as receiver', 'messages.receiver_id', 'receiver.id')
      .where(function() {
        this.where('messages.sender_id', req.user.id)
            .orWhere('messages.receiver_id', req.user.id);
      })
      .where('messages.is_deleted', false)
      .where('messages.content', 'ilike', `%${q.trim()}%`);

    if (user_id) {
      query = query.where(function() {
        this.where({
          'messages.sender_id': user_id,
          'messages.receiver_id': req.user.id
        }).orWhere({
          'messages.sender_id': req.user.id,
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
      .limit(limit)
      .offset(offset);

    const formattedMessages = messages.map(msg => ({
      id: msg.id,
      senderId: msg.sender_id,
      receiverId: msg.receiver_id,
      content: msg.content,
      messageType: msg.message_type,
      replyToId: msg.reply_to_id,
      isRead: msg.is_read,
      isEdited: msg.is_edited,
      editedAt: msg.edited_at,
      createdAt: msg.created_at,
      sender: {
        id: msg.sender_id,
        first_name: msg.sender_first_name,
        last_name: msg.sender_last_name,
        avatar_url: msg.sender_avatar
      },
      receiver: {
        id: msg.receiver_id,
        first_name: msg.receiver_first_name,
        last_name: msg.receiver_last_name,
        avatar_url: msg.receiver_avatar
      },
      isFromMe: msg.sender_id === req.user.id
    }));

    res.json({
      messages: formattedMessages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        hasMore: messages.length === parseInt(limit)
      },
      query: q.trim()
    });

  } catch (error) {
    logger.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

/**
 * @route POST /api/messages/:messageId/reactions
 * @desc Add or toggle a reaction to a message
 * @access Private
 */
router.post('/:messageId/reactions', auth, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { emoji } = req.body;

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    // Get the existing message
    const existingMessage = await db('messages')
      .where('id', messageId)
      .where('is_deleted', false)
      .where(function() {
        this.where('sender_id', req.user.id)
            .orWhere('receiver_id', req.user.id);
      })
      .first();

    if (!existingMessage) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Parse existing reactions with structure: { "emoji": { "count": 0, "users": [] } }
    const reactions = safeJsonParse(existingMessage.reactions, {});
    
    // Initialize emoji reaction if it doesn't exist
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: [] };
    }

    // Check if user has already reacted with this emoji
    const userIndex = reactions[emoji].users.indexOf(req.user.id);
    
    if (userIndex > -1) {
      // User has already reacted, remove the reaction
      reactions[emoji].users.splice(userIndex, 1);
      reactions[emoji].count = Math.max(0, reactions[emoji].count - 1);
      
      // Remove emoji entirely if no reactions left
      if (reactions[emoji].count === 0) {
        delete reactions[emoji];
      }
    } else {
      // User hasn't reacted, add the reaction
      reactions[emoji].users.push(req.user.id);
      reactions[emoji].count += 1;
    }

    // Update the message with new reactions
    await db('messages')
      .where('id', messageId)
      .update({
        reactions: JSON.stringify(reactions),
        updated_at: new Date()
      });

    res.json({
      message: userIndex > -1 ? 'Reaction removed successfully' : 'Reaction added successfully',
      reactions
    });

  } catch (error) {
    logger.error('Error toggling message reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

/**
 * @route PUT /api/messages/:messageId/delivered
 * @desc Mark a message as delivered
 * @access Private
 */
router.put('/:messageId/delivered', auth, async (req, res) => {
  try {
    const { messageId } = req.params;

    // Verify message exists and user is the receiver
    const message = await db('messages')
      .where('id', messageId)
      .where('receiver_id', req.user.id)
      .where('is_deleted', false)
      .first();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Update message as delivered if not already
    if (!message.delivered_at) {
      await db('messages')
        .where('id', messageId)
        .update({
          delivered_at: new Date(),
          read_status: 'delivered',
          updated_at: new Date()
        });
    }

    res.json({
      message: 'Message marked as delivered'
    });

  } catch (error) {
    logger.error('Error marking message as delivered:', error);
    res.status(500).json({ error: 'Failed to mark message as delivered' });
  }
});

/**
 * @route POST /api/messages/conversation/:conversationId/typing
 * @desc Send typing indicator for a conversation
 * @access Private
 */
router.post('/conversation/:conversationId/typing', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { isTyping = true } = req.body;

    // Verify user is participant (quick check)
    const isParticipant = await db('conversation_participants')
      .where('conversation_id', conversationId)
      .where('user_id', req.user.id)
      .where('is_active', true)
      .first();

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get user details for typing indicator
    const user = await db('users')
      .where('id', req.user.id)
      .select('id', 'first_name', 'last_name', 'avatar_url')
      .first();

    // Emit typing indicator via socket
    try {
      const io = req.app.get('io');
      if (io) {
        const typingData = {
          conversationId,
          user: {
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            avatar_url: user.avatar_url
          },
          isTyping,
          timestamp: new Date().toISOString()
        };

        // Emit to conversation participants except the sender
        io.emitToConversation(conversationId, 'typing:indicator', typingData, req.user.id);
        
        // Store in database for persistence (optional)
        if (isTyping) {
          await db('typing_indicators')
            .insert({
              conversation_id: conversationId,
              user_id: req.user.id,
              is_typing: true,
              created_at: new Date(),
              updated_at: new Date()
            })
            .onConflict(['conversation_id', 'user_id'])
            .merge(['is_typing', 'updated_at']);
        } else {
          await db('typing_indicators')
            .where('conversation_id', conversationId)
            .where('user_id', req.user.id)
            .update({
              is_typing: false,
              updated_at: new Date()
            });
        }
      }
    } catch (socketError) {
      logger.error('Error emitting typing indicator:', socketError);
    }

    res.json({
      message: 'Typing indicator sent',
      isTyping
    });

  } catch (error) {
    logger.error('Error sending typing indicator:', error);
    res.status(500).json({ error: 'Failed to send typing indicator' });
  }
});

/**
 * @route GET /api/messages/conversation/:conversationId/typing
 * @desc Get current typing indicators for a conversation
 * @access Private
 */
router.get('/conversation/:conversationId/typing', auth, async (req, res) => {
  try {
    const { conversationId } = req.params;

    // Verify user is participant
    const isParticipant = await db('conversation_participants')
      .where('conversation_id', conversationId)
      .where('user_id', req.user.id)
      .where('is_active', true)
      .first();

    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get current typing indicators (exclude current user)
    const typingUsers = await db('typing_indicators')
      .join('users', 'typing_indicators.user_id', 'users.id')
      .where('typing_indicators.conversation_id', conversationId)
      .where('typing_indicators.is_typing', true)
      .where('typing_indicators.user_id', '!=', req.user.id)
      .where('typing_indicators.updated_at', '>', new Date(Date.now() - 5000)) // Only recent (5 seconds)
      .select(
        'users.id',
        'users.first_name',
        'users.last_name',
        'users.avatar_url',
        'typing_indicators.updated_at'
      );

    res.json({
      typingUsers: typingUsers.map(user => ({
        id: user.id,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.avatar_url,
        lastTyping: user.updated_at
      }))
    });

  } catch (error) {
    logger.error('Error fetching typing indicators:', error);
    res.status(500).json({ error: 'Failed to fetch typing indicators' });
  }
});

module.exports = router; 