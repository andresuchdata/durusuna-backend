import express, { Request, Response, NextFunction } from 'express';
import { MessageService } from '../services/messageService';
import { MessageRepository } from '../repositories/messageRepository';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate, messageSchema } from '../utils/validation';
import logger from '../shared/utils/logger';
import { AuthenticatedRequest } from '../types/auth';
import {
  MessageSearchParams
} from '../types/message';
import { safeJsonParse } from '../utils/json';

const router = express.Router();

// Initialize service layer
const messageRepository = new MessageRepository(db);
const messageService = new MessageService(messageRepository);

/**
 * @route POST /api/messages
 * @desc Send a direct message (creates conversation if needed)
 * @access Private
 */
router.post('/', authenticate, validate(messageSchema), async (req, res, next) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const response = await messageService.sendMessage(req.body, authenticatedReq.user);

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
 * @route GET /api/messages/search
 * @desc Search messages across all conversations
 * @access Private
 */
router.get('/search', authenticate, async (req, res, next) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { q, user_id, message_type, page = '1', limit = '20' } = req.query as MessageSearchParams & { page?: string; limit?: string };

    const response = await messageService.searchMessages(
      { q, user_id, message_type },
      authenticatedReq.user,
      parseInt(page),
      parseInt(limit)
    );

    res.json(response);

  } catch (error) {
    if (error instanceof Error && error.message === 'Search query must be at least 2 characters long') {
      return res.status(400).json({ error: error.message });
    }
    
    logger.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

/**
 * @route POST /api/messages/:messageId/reactions
 * @desc Toggle a reaction on a message
 * @access Private
 */
router.post('/:messageId/reactions', authenticate, async (req, res, next) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { messageId } = req.params;
    const { emoji } = req.body as { emoji?: string };

    if (!emoji || typeof emoji !== 'string') {
      return res.status(400).json({ error: 'Emoji is required' });
    }

    const result = await messageService.toggleReaction(messageId!, emoji, authenticatedReq.user);
    return res.json({ message: 'Reaction toggled', reactions: result.reactions });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Message not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({ error: error.message });
      }
      if (error.message === 'Emoji is required') {
        return res.status(400).json({ error: error.message });
      }
    }
    logger.error('Error toggling message reaction:', error);
    res.status(500).json({ error: 'Failed to toggle reaction' });
  }
});

export default router;