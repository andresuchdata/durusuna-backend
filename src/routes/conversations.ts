import express, { Request, Response } from 'express';
import { ConversationService } from '../services/conversationService';
import { MessageRepository } from '../repositories/messageRepository';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate, messageSchema } from '../utils/validation';
import logger from '../utils/logger';
import { AuthenticatedRequest } from '../types/auth';
import {
  ConversationPaginationParams
} from '../types/message';

const router = express.Router();

// Initialize service layer
const messageRepository = new MessageRepository(db);
const conversationService = new ConversationService(messageRepository);

/**
 * @route GET /api/conversations
 * @desc Get all conversations for the current user (optimized with caching)
 * @access Private
 */
router.get('/', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { page = '1', limit = '15' } = req.query as { page?: string; limit?: string };
    
    const response = await conversationService.getConversations(
      authenticatedReq.user,
      parseInt(page),
      parseInt(limit)
    );

    res.json(response);

  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

/**
 * @route GET /api/conversations/:conversationId/messages
 * @desc Get messages for a specific conversation (optimized for smooth loading)
 * @access Private
 */
router.get('/:conversationId/messages', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const { 
      page = '1', 
      limit = '25',
      cursor,
      loadDirection = 'before'
    } = req.query as ConversationPaginationParams & { page?: string; limit?: string };

    const response = await conversationService.getConversationMessages(
      conversationId!,
      authenticatedReq.user,
      {
        page: parseInt(page),
        limit: parseInt(limit),
        cursor,
        loadDirection
      }
    );

    res.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'Conversation not found or access denied') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error fetching conversation messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

/**
 * @route GET /api/conversations/:conversationId/messages/load-more
 * @desc Load more messages for infinite scroll (optimized for performance)
 * @access Private
 */
router.get('/:conversationId/messages/load-more', authenticate, async (req: Request, res: Response) => {
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

    const response = await conversationService.loadMoreMessages(
      conversationId!,
      authenticatedReq.user,
      cursor,
      direction,
      parseInt(limit)
    );

    res.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'Access denied') {
      return res.status(403).json({ error: error.message });
    }
    
    logger.error('Error loading more messages:', error);
    res.status(500).json({ error: 'Failed to load more messages' });
  }
});

/**
 * @route POST /api/conversations/:conversationId/messages
 * @desc Send a message to a specific conversation
 * @access Private
 */
router.post('/:conversationId/messages', authenticate, validate(messageSchema), async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    
    // Use the conversation-specific method instead of the general sendMessage
    const response = await conversationService.sendMessageToConversation(
      conversationId!,
      req.body,
      authenticatedReq.user
    );

    res.status(201).json(response);

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Not a participant in this conversation' || 
          error.message === 'Access denied') {
        return res.status(403).json({ error: error.message });
      }
      
      if (error.message === 'Conversation not found' || 
          error.message === 'Receiver not found' ||
          error.message === 'Invalid reply-to message') {
        return res.status(404).json({ error: error.message });
      }
      
      if (error.message === 'Either conversation_id or receiver_id is required') {
        return res.status(400).json({ error: error.message });
      }
    }
    
    logger.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

/**
 * @route PUT /api/conversations/:conversationId/mark-read
 * @desc Mark all messages in a conversation as read (reset unread count)
 * @access Private
 */
router.put('/:conversationId/mark-read', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;

    await conversationService.markConversationAsRead(conversationId!, authenticatedReq.user);

    res.json({
      message: 'Conversation marked as read',
      conversation_id: conversationId
    });

  } catch (error) {
    if (error instanceof Error && error.message === 'Conversation not found or access denied') {
      return res.status(404).json({ error: error.message });
    }
    
    logger.error('Error marking conversation as read:', error);
    res.status(500).json({ error: 'Failed to mark conversation as read' });
  }
});

export default router; 