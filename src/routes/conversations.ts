import express, { Request, Response, NextFunction } from 'express';
import { ConversationService } from '../services/conversationService';
import { MessageService } from '../services/messageService';
import { MessageRepository } from '../repositories/messageRepository';
import { AccessControlService } from '../services/accessControlService';
import db from '../config/database';
import { authenticate } from '../middleware/auth';
import { validate, messageSchema } from '../utils/validation';
import logger from '../shared/utils/logger';
import { AuthenticatedRequest } from '../types/auth';
import {
  ConversationPaginationParams
} from '../types/message';

const router = express.Router();

// Initialize service layer
const messageRepository = new MessageRepository(db);
const accessControlService = new AccessControlService(db);
const conversationService = new ConversationService(messageRepository);
const messageService = new MessageService(messageRepository);

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
 * @route GET /api/conversations/:conversationId
 * @desc Get conversation details including participants
 * @access Private
 */
router.get('/:conversationId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    
    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Verify user is a participant of the conversation
    const isParticipant = await conversationService.isUserParticipant(conversationId, authenticatedReq.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get conversation details and participants using the service
    // We'll need to create a method in the service to get conversation with participants
    // For now, let's use a simpler approach by getting the data from the messages endpoint
    // which already includes participant information
    
    // Get one message to extract conversation and participant info
    const messagesResponse = await conversationService.getConversationMessages(
      conversationId,
      authenticatedReq.user,
      { page: 1, limit: 1 }
    );

    if (messagesResponse.conversation) {
      res.json({
        id: messagesResponse.conversation.id,
        type: messagesResponse.conversation.type,
        name: messagesResponse.conversation.name,
        description: messagesResponse.conversation.description,
        avatar_url: messagesResponse.conversation.avatar_url,
        created_by: messagesResponse.conversation.created_by,
        is_active: messagesResponse.conversation.is_active,
        created_at: messagesResponse.conversation.created_at,
        updated_at: messagesResponse.conversation.updated_at,
        participants: messagesResponse.participants || []
      });
    } else {
      res.status(404).json({ error: 'Conversation not found' });
    }

  } catch (error) {
    logger.error('Error fetching conversation details:', error);
    res.status(500).json({ error: 'Failed to fetch conversation details' });
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

/**
 * @route DELETE /api/conversations/:conversationId/messages/:messageId
 * @desc Delete a single message (soft delete)
 * @access Private
 */
router.delete('/:conversationId/messages/:messageId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { messageId } = req.params;

    if (!messageId) {
      return res.status(400).json({ error: 'Message ID is required' });
    }

    const result = await messageService.deleteMessage(messageId, authenticatedReq.user);

    if (!result.success) {
      if (result.message === 'Message not found or access denied') {
        return res.status(404).json({ error: result.message });
      }
      return res.status(400).json({ error: result.message || 'Failed to delete message' });
    }

    res.json({
      message: 'Message deleted successfully',
      message_id: messageId
    });

  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

/**
 * @route DELETE /api/conversations/:conversationId/messages/batch
 * @desc Delete multiple messages in batch (soft delete)
 * @access Private
 */
router.delete('/:conversationId/messages/batch', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { message_ids } = req.body;

    if (!Array.isArray(message_ids) || message_ids.length === 0) {
      return res.status(400).json({ error: 'message_ids array is required' });
    }

    if (message_ids.length > 50) {
      return res.status(400).json({ error: 'Maximum 50 messages can be deleted at once' });
    }

    const result = await messageService.deleteBatchMessages(message_ids, authenticatedReq.user);

    if (result.deletedCount === 0 && result.failedCount > 0) {
      return res.status(404).json({ 
        error: 'No messages were deleted',
        deleted_count: 0,
        failed_count: result.failedCount
      });
    }

    res.json({
      message: `${result.deletedCount} message${result.deletedCount !== 1 ? 's' : ''} deleted successfully`,
      deleted_count: result.deletedCount,
      failed_count: result.failedCount
    });

  } catch (error) {
    logger.error('Error deleting batch messages:', error);
    res.status(500).json({ error: 'Failed to delete messages' });
  }
});

/**
 * @route POST /api/conversations
 * @desc Create a new conversation (direct or group)
 * @access Private
 */
router.post('/', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { type, participant_ids, name, description } = req.body as {
      type?: string;
      participant_ids?: string[];
      name?: string;
      description?: string;
    };

    if (!type || !['direct', 'group'].includes(type)) {
      return res.status(400).json({ error: 'Valid conversation type (direct or group) is required' });
    }

    if (!Array.isArray(participant_ids) || participant_ids.length === 0) {
      return res.status(400).json({ error: 'participant_ids array is required' });
    }

    if (type === 'direct' && participant_ids.length !== 1) {
      return res.status(400).json({ error: 'Direct conversations must have exactly one participant' });
    }

    if (type === 'group' && participant_ids.length < 2) {
      return res.status(400).json({ error: 'Group conversations must have at least 2 participants' });
    }

    if (type === 'group' && (!name || name.trim().length === 0)) {
      return res.status(400).json({ error: 'Group conversations must have a name' });
    }

    // Validate that current user can access all participants
    const canAccessParticipants = await accessControlService.canAccessConversationParticipants(
      authenticatedReq.user,
      participant_ids
    );

    if (!canAccessParticipants) {
      return res.status(403).json({ 
        error: 'Access denied: You cannot create conversations with one or more of these participants' 
      });
    }

    // For direct conversations, check if one already exists
    if (type === 'direct') {
      if (!participant_ids[0]) {
        return res.status(400).json({ error: 'Participant ID is required for direct conversations' });
      }
      const existingConversation = await conversationService.findDirectConversation(
        authenticatedReq.user.id,
        participant_ids[0]
      );
      if (existingConversation) {
        return res.json({ conversation: existingConversation });
      }
    }

    // Create the conversation
    const conversation = await conversationService.createConversation({
      type,
      createdBy: authenticatedReq.user.id,
      participantIds: [authenticatedReq.user.id, ...participant_ids],
      name: type === 'group' ? name : undefined,
      description: type === 'group' ? description : undefined,
    });

    res.status(201).json({ conversation });

  } catch (error) {
    logger.error('Error creating conversation:', error);
    res.status(500).json({ error: 'Failed to create conversation' });
  }
});

/**
 * @route POST /api/conversations/:conversationId/messages/reactions
 * @desc Fetch reactions for multiple messages in a conversation
 * @access Private
 */
router.post('/:conversationId/messages/reactions', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const { messageIds } = req.body as { messageIds?: string[] };

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    if (!Array.isArray(messageIds) || messageIds.length === 0) {
      return res.status(400).json({ error: 'messageIds array is required' });
    }

    if (messageIds.length > 100) {
      return res.status(400).json({ error: 'Maximum 100 messages can be fetched at once' });
    }

    // Verify user is a participant of the conversation
    const isParticipant = await conversationService.isUserParticipant(conversationId, authenticatedReq.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Fetch messages with reactions
    const messages = await messageService.getMessagesWithReactions(conversationId, messageIds);

    res.json({
      messages: messages.map(msg => ({
        id: msg.id,
        reactions: msg.reactions || {}
      }))
    });

  } catch (error) {
    logger.error('Error fetching message reactions:', error);
    res.status(500).json({ error: 'Failed to fetch message reactions' });
  }
});

/**
 * @route PUT /api/conversations/:conversationId
 * @desc Update conversation details (name, description, avatar) - for group conversations only
 * @access Private
 */
router.put('/:conversationId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;
    const { name, description, avatar_url } = req.body as {
      name?: string;
      description?: string;
      avatar_url?: string;
    };

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Verify user is a participant of the conversation
    const isParticipant = await conversationService.isUserParticipant(conversationId, authenticatedReq.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get conversation details to check if it's a group conversation
    const conversation = await conversationService.getConversationById(conversationId);
    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    // Only allow updates for group conversations
    if (conversation.type !== 'group') {
      return res.status(400).json({ error: 'Only group conversations can be updated' });
    }

    // Check if user has permission to update (admin or creator)
    const userRole = await conversationService.getUserRoleInConversation(conversationId, authenticatedReq.user.id);
    if (userRole !== 'admin' && conversation.created_by !== authenticatedReq.user.id) {
      return res.status(403).json({ error: 'Only admins or group creators can update group details' });
    }

    // Prepare update data
    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'At least one field must be provided for update' });
    }

    // Update the conversation
    await conversationService.updateConversation(conversationId, updateData, authenticatedReq.user.id);

    // Get updated conversation details
    const updatedConversation = await conversationService.getConversationById(conversationId);

    res.json({
      message: 'Conversation updated successfully',
      conversation: updatedConversation
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Conversation not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Access denied' || error.message === 'Only admins or group creators can update group details') {
        return res.status(403).json({ error: error.message });
      }
    }
    
    logger.error('Error updating conversation:', error);
    res.status(500).json({ error: 'Failed to update conversation' });
  }
});

/**
 * @route DELETE /api/conversations/:conversationId
 * @desc Leave a group conversation or delete a direct conversation from user's view
 * @access Private
 */
router.delete('/:conversationId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { conversationId } = req.params;

    if (!conversationId) {
      return res.status(400).json({ error: 'Conversation ID is required' });
    }

    // Verify user is a participant of the conversation
    const isParticipant = await conversationService.isUserParticipant(conversationId, authenticatedReq.user.id);
    if (!isParticipant) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete/leave the conversation using the service (handles logic internally)
    const result = await conversationService.deleteConversation(conversationId, authenticatedReq.user.id);

    const message = result.action === 'left' 
      ? 'Left the group conversation successfully' 
      : 'Conversation deleted successfully';

    res.json({
      message,
      action: result.action,
      conversation_id: conversationId
    });

  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Conversation not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message === 'Access denied') {
        return res.status(403).json({ error: error.message });
      }
    }
    
    logger.error('Error deleting conversation:', error);
    res.status(500).json({ error: 'Failed to delete conversation' });
  }
});

export default router; 