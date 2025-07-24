const request = require('supertest');
const express = require('express');
const {
  mockDb,
  mockLogger,
  createMockUser,
  createMockMessage,
  createMockConversation,
  createMockReq,
  createMockRes,
  createMockNext,
  mockAuthenticate,
  mockValidate,
  resetMocks
} = require('./setup');

// Mock the dependencies
jest.mock('../src/config/database', () => mockDb);
jest.mock('../src/utils/logger', () => mockLogger);
jest.mock('../src/middleware/auth', () => ({
  authenticate: mockAuthenticate
}));
jest.mock('../src/utils/validation', () => ({
  validate: mockValidate,
  messageSchema: {}
}));

// Import the messages routes after mocking
const messagesRoutes = require('../src/routes/messages');

describe('Messages Controller', () => {
  let app;
  let mockUser;
  let mockOtherUser;

  beforeEach(() => {
    resetMocks();
    app = express();
    app.use(express.json());
    app.use('/messages', messagesRoutes);
    
    mockUser = createMockUser();
    mockOtherUser = createMockUser({ 
      id: 'other-user-id', 
      email: 'other@example.com',
      first_name: 'Jane',
      last_name: 'Smith'
    });
  });

  describe('GET /messages/conversations', () => {
    it('should return conversations list', async () => {
      const mockConversations = [
        createMockConversation({
          other_user_id: mockOtherUser.id,
          other_user_first_name: mockOtherUser.first_name,
          other_user_last_name: mockOtherUser.last_name,
          last_message_content: 'Hello there!',
          unread_count: '2'
        })
      ];

      // Mock complex conversation query
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockConversations)
      });

      const response = await request(app)
        .get('/messages/conversations')
        .expect(200);

      expect(response.body).toMatchObject({
        conversations: expect.arrayContaining([
          expect.objectContaining({
            otherUser: expect.objectContaining({
              id: mockOtherUser.id,
              firstName: mockOtherUser.first_name,
              lastName: mockOtherUser.last_name
            }),
            lastMessage: expect.objectContaining({
              content: 'Hello there!'
            }),
            unreadCount: 2
          })
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20
        })
      });
    });

    it('should handle pagination parameters', async () => {
      const mockConversations = [];

      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        select: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        whereIn: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockConversations)
      });

      const response = await request(app)
        .get('/messages/conversations?page=2&limit=10')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 10,
        hasMore: false
      });
    });

    it('should handle database errors', async () => {
      mockDb.messages.mockImplementationOnce(() => {
        throw new Error('Database error');
      });

      const response = await request(app)
        .get('/messages/conversations')
        .expect(500);

      expect(response.body).toMatchObject({
        error: 'Failed to fetch conversations'
      });
    });
  });

  describe('GET /messages/conversation/:userId', () => {
    it('should return messages for a specific conversation', async () => {
      const mockMessages = [
        createMockMessage({
          sender_id: mockUser.id,
          receiver_id: mockOtherUser.id,
          content: 'Hello!',
          attachments: []
        }),
        createMockMessage({
          sender_id: mockOtherUser.id,
          receiver_id: mockUser.id,
          content: 'Hi there!',
          attachments: []
        })
      ];

      // Mock other user exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockOtherUser)
      });

      // Mock messages query
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockMessages)
      });

      const response = await request(app)
        .get(`/messages/conversation/${mockOtherUser.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: 'Hello!',
            isFromMe: true
          }),
          expect.objectContaining({
            content: 'Hi there!',
            isFromMe: false
          })
        ]),
        otherUser: expect.objectContaining({
          id: mockOtherUser.id,
          firstName: mockOtherUser.first_name,
          lastName: mockOtherUser.last_name
        }),
        pagination: expect.any(Object)
      });
    });

    it('should return 404 if other user not found', async () => {
      // Mock user doesn't exist
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .get('/messages/conversation/nonexistent-user-id')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'User not found'
      });
    });

    it('should handle pagination for messages', async () => {
      const mockMessages = Array(50).fill(null).map(() => createMockMessage());

      // Mock other user exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockOtherUser)
      });

      // Mock messages query
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockMessages)
      });

      const response = await request(app)
        .get(`/messages/conversation/${mockOtherUser.id}?page=1&limit=50`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 50,
        hasMore: true
      });
    });
  });

  describe('POST /messages/send', () => {
    it('should send a message successfully', async () => {
      const messageData = {
        receiver_id: mockOtherUser.id,
        content: 'Hello there!',
        message_type: 'text'
      };

      const newMessage = createMockMessage({
        id: 'new-message-id',
        sender_id: mockUser.id,
        receiver_id: mockOtherUser.id,
        content: messageData.content
      });

      // Mock receiver exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockOtherUser)
      });

      // Mock message creation
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        insert: jest.fn().mockReturnValueOnce({
          returning: jest.fn().mockResolvedValue([newMessage])
        })
      });

      // Mock getting complete message
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(newMessage)
        })
      });

      const response = await request(app)
        .post('/messages/send')
        .send(messageData)
        .expect(201);

      expect(response.body).toMatchObject({
        message: expect.objectContaining({
          content: 'Hello there!',
          senderId: mockUser.id,
          receiverId: mockOtherUser.id,
          isFromMe: true
        })
      });
    });

    it('should return 404 if receiver not found', async () => {
      const messageData = {
        receiver_id: 'nonexistent-user-id',
        content: 'Hello there!',
        message_type: 'text'
      };

      // Mock receiver doesn't exist
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .post('/messages/send')
        .send(messageData)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Receiver not found'
      });
    });

    it('should handle reply-to message validation', async () => {
      const messageData = {
        receiver_id: mockOtherUser.id,
        content: 'This is a reply',
        message_type: 'text',
        reply_to_id: 'nonexistent-message-id'
      };

      // Mock receiver exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockOtherUser)
      });

      // Mock reply-to message doesn't exist
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .post('/messages/send')
        .send(messageData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Invalid reply-to message'
      });
    });

    it('should send message with metadata', async () => {
      const messageData = {
        receiver_id: mockOtherUser.id,
        content: null,
        message_type: 'image',
        metadata: {
          imageUrl: 'https://example.com/image.jpg',
          caption: 'Check this out!'
        }
      };

      // Mock receiver exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockOtherUser)
      });

      const newMessage = createMockMessage({
        sender_id: mockUser.id,
        receiver_id: mockOtherUser.id,
        content: null,
        message_type: 'image'
      });

      // Mock message creation
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        insert: jest.fn().mockReturnValueOnce({
          returning: jest.fn().mockResolvedValue([newMessage])
        })
      });

      // Mock getting complete message
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(newMessage)
        })
      });

      const response = await request(app)
        .post('/messages/send')
        .send(messageData)
        .expect(201);

      expect(response.body.message).toMatchObject({
        messageType: 'image',
        content: null
      });
    });
  });

  describe('PUT /messages/:messageId/mark-read', () => {
    it('should mark message as read successfully', async () => {
      const messageId = 'test-message-id';
      const mockMessage = createMockMessage({
        id: messageId,
        receiver_id: mockUser.id,
        is_read: false
      });

      // Mock message exists and user is receiver
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockMessage)
      });

      // Mock message update
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .put(`/messages/${messageId}/mark-read`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Message marked as read'
      });
    });

    it('should return 404 if message not found or user not receiver', async () => {
      const messageId = 'nonexistent-message-id';

      // Mock message doesn't exist
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .put(`/messages/${messageId}/mark-read`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Message not found'
      });
    });
  });

  describe('PUT /messages/:messageId', () => {
    it('should edit message successfully', async () => {
      const messageId = 'test-message-id';
      const editData = {
        content: 'Updated message content'
      };

      const mockMessage = createMockMessage({
        id: messageId,
        sender_id: mockUser.id,
        created_at: new Date() // Recent message
      });

      // Mock message exists and user is sender
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockMessage)
      });

      // Mock message update
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const updatedMessage = {
        ...mockMessage,
        content: editData.content,
        is_edited: true,
        edited_at: new Date()
      };

      // Mock getting updated message
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(updatedMessage)
        })
      });

      const response = await request(app)
        .put(`/messages/${messageId}`)
        .send(editData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: expect.objectContaining({
          content: 'Updated message content',
          isEdited: true
        })
      });
    });

    it('should return 400 for empty content', async () => {
      const messageId = 'test-message-id';
      const editData = {
        content: ''
      };

      const response = await request(app)
        .put(`/messages/${messageId}`)
        .send(editData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Message content is required'
      });
    });

    it('should return 404 if message not found or user not sender', async () => {
      const messageId = 'nonexistent-message-id';
      const editData = {
        content: 'Updated content'
      };

      // Mock message doesn't exist
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .put(`/messages/${messageId}`)
        .send(editData)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Message not found'
      });
    });

    it('should return 400 if message is too old to edit', async () => {
      const messageId = 'test-message-id';
      const editData = {
        content: 'Updated content'
      };

      const oldMessage = createMockMessage({
        id: messageId,
        sender_id: mockUser.id,
        created_at: new Date(Date.now() - 25 * 60 * 60 * 1000) // 25 hours ago
      });

      // Mock message exists but is too old
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(oldMessage)
      });

      const response = await request(app)
        .put(`/messages/${messageId}`)
        .send(editData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Message is too old to edit (24 hour limit)'
      });
    });
  });

  describe('DELETE /messages/:messageId', () => {
    it('should delete message successfully', async () => {
      const messageId = 'test-message-id';

      const mockMessage = createMockMessage({
        id: messageId,
        sender_id: mockUser.id
      });

      // Mock message exists and user is sender
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockMessage)
      });

      // Mock message soft delete
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .delete(`/messages/${messageId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Message deleted successfully'
      });
    });

    it('should return 404 if message not found or user not sender', async () => {
      const messageId = 'nonexistent-message-id';

      // Mock message doesn't exist
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .delete(`/messages/${messageId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Message not found'
      });
    });
  });

  describe('GET /messages/search', () => {
    it('should search messages successfully', async () => {
      const mockMessages = [
        createMockMessage({
          content: 'Hello world test message',
          sender_id: mockUser.id,
          receiver_id: mockOtherUser.id
        }),
        createMockMessage({
          content: 'Another test message here',
          sender_id: mockOtherUser.id,
          receiver_id: mockUser.id
        })
      ];

      // Mock search query
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockMessages)
      });

      const response = await request(app)
        .get('/messages/search?q=test')
        .expect(200);

      expect(response.body).toMatchObject({
        messages: expect.arrayContaining([
          expect.objectContaining({
            content: expect.stringContaining('test')
          })
        ]),
        pagination: expect.any(Object),
        query: 'test'
      });
    });

    it('should return 400 for short search query', async () => {
      const response = await request(app)
        .get('/messages/search?q=a')
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Search query must be at least 2 characters long'
      });
    });

    it('should filter search by user_id', async () => {
      const mockMessages = [
        createMockMessage({
          content: 'Test message from specific user',
          sender_id: mockOtherUser.id,
          receiver_id: mockUser.id
        })
      ];

      // Mock search query with user filter
      let mockQueryBuilder = {
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockMessages)
      };

      mockDb.messages.mockReturnValueOnce(mockQueryBuilder);

      const response = await request(app)
        .get(`/messages/search?q=test&user_id=${mockOtherUser.id}`)
        .expect(200);

      expect(response.body).toMatchObject({
        messages: expect.any(Array),
        query: 'test'
      });
    });

    it('should filter search by message_type', async () => {
      const mockMessages = [
        createMockMessage({
          content: 'Test image message',
          message_type: 'image'
        })
      ];

      // Mock search query with message type filter
      let mockQueryBuilder = {
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockMessages)
      };

      mockDb.messages.mockReturnValueOnce(mockQueryBuilder);

      const response = await request(app)
        .get('/messages/search?q=test&message_type=image')
        .expect(200);

      expect(response.body).toMatchObject({
        messages: expect.any(Array),
        query: 'test'
      });
    });

    it('should handle search pagination', async () => {
      const mockMessages = Array(20).fill(null).map(() => 
        createMockMessage({ content: 'Test message' })
      );

      // Mock search query
      mockDb.messages.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockMessages)
      });

      const response = await request(app)
        .get('/messages/search?q=test&page=1&limit=20')
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 1,
        limit: 20,
        hasMore: true
      });
    });
  });
}); 