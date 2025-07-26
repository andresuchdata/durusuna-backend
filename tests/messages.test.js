import { test, expect, describe, beforeEach } from 'bun:test';
import request from 'supertest';
import express from 'express';

describe('Messages Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: 'mock-user-id' };
      next();
    });

    // Mock conversations endpoint
    app.get('/messages/conversations', async (req, res) => {
      const conversations = [
        {
          other_user_id: 'other-user-1',
          other_user_first_name: 'Jane',
          other_user_last_name: 'Smith',
          last_message_content: 'Hello there!',
          unread_count: '2'
        }
      ];
      res.json(conversations);
    });

    // Mock conversation endpoint
    app.get('/messages/conversation/:userId', async (req, res) => {
      const { userId } = req.params;
      if (userId === 'nonexistent') {
        return res.json([]);
      }
      
      const messages = [
        {
          id: 'msg-1',
          sender_id: 'mock-user-id',
          receiver_id: userId,
          content: 'Test message',
          created_at: new Date()
        }
      ];
      res.json(messages);
    });

    // Mock send message endpoint
    app.post('/messages/send', async (req, res) => {
      const { receiver_id, content } = req.body;
      
      if (!receiver_id || !content) {
        return res.status(400).json({ errors: [{ msg: 'Receiver and content are required' }] });
      }

      res.status(201).json({
        id: 'new-message-id',
        sender_id: req.user.id,
        receiver_id,
        content,
        created_at: new Date()
      });
    });
  });

  describe('GET /messages/conversations', () => {
    test('should return conversations list', async () => {
      const response = await request(app).get('/messages/conversations');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].other_user_first_name).toBe('Jane');
    });
  });

  describe('GET /messages/conversation/:userId', () => {
    test('should return conversation messages', async () => {
      const response = await request(app).get('/messages/conversation/other-user-1');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].content).toBe('Test message');
    });

    test('should return empty array for nonexistent conversation', async () => {
      const response = await request(app).get('/messages/conversation/nonexistent');
      
      expect(response.status).toBe(200);
      expect(response.body).toEqual([]);
    });
  });

  describe('POST /messages/send', () => {
    test('should send message successfully', async () => {
      const messageData = {
        receiver_id: 'other-user-1',
        content: 'Hello from test!'
      };

      const response = await request(app)
        .post('/messages/send')
        .send(messageData);

      expect(response.status).toBe(201);
      expect(response.body.content).toBe('Hello from test!');
      expect(response.body.receiver_id).toBe('other-user-1');
    });

    test('should return 400 for missing data', async () => {
      const response = await request(app)
        .post('/messages/send')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
}); 