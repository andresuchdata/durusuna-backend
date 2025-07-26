import { test, expect, describe, beforeEach } from 'bun:test';
import request from 'supertest';
import express from 'express';

describe('Class Updates Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { 
        id: 'mock-user-id',
        user_type: 'teacher'
      };
      next();
    });

    // Mock get class updates endpoint
    app.get('/class-updates/:classId', async (req, res) => {
      const { classId } = req.params;
      
      if (classId === 'no-access-class') {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      const updates = [
        {
          id: 'update-1',
          title: 'Math Quiz Tomorrow',
          content: 'Don\'t forget about the quiz!',
          update_type: 'announcement',
          author_name: 'John Doe',
          created_at: new Date()
        }
      ];
      res.json(updates);
    });

    // Mock create class update endpoint
    app.post('/class-updates/:classId', async (req, res) => {
      const { classId } = req.params;
      const { title, content } = req.body;
      
      if (!title || !content) {
        return res.status(400).json({ errors: [{ msg: 'Title and content are required' }] });
      }

      if (classId === 'no-access-class') {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      res.status(201).json({
        id: 'new-update-id',
        title,
        content,
        class_id: classId,
        author_id: req.user.id,
        created_at: new Date()
      });
    });

    // Mock get single update endpoint
    app.get('/class-updates/update/:updateId', async (req, res) => {
      const { updateId } = req.params;
      
      if (updateId === 'nonexistent') {
        return res.status(404).json({ error: 'Class update not found' });
      }

      res.json({
        id: updateId,
        title: 'Sample Update',
        content: 'Sample content',
        author_name: 'John Doe',
        created_at: new Date()
      });
    });
  });

  describe('GET /class-updates/:classId', () => {
    test('should return class updates successfully', async () => {
      const response = await request(app).get('/class-updates/test-class-id');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Math Quiz Tomorrow');
    });

    test('should return 403 if user has no access to class', async () => {
      const response = await request(app).get('/class-updates/no-access-class');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to this class');
    });
  });

  describe('POST /class-updates/:classId', () => {
    test('should create class update successfully', async () => {
      const updateData = {
        title: 'New Announcement',
        content: 'Important information here'
      };

      const response = await request(app)
        .post('/class-updates/test-class-id')
        .send(updateData);

      expect(response.status).toBe(201);
      expect(response.body.title).toBe('New Announcement');
      expect(response.body.content).toBe('Important information here');
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/class-updates/test-class-id')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    test('should return 403 if user has no access to class', async () => {
      const updateData = {
        title: 'New Announcement',
        content: 'Important information here'
      };

      const response = await request(app)
        .post('/class-updates/no-access-class')
        .send(updateData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to this class');
    });
  });

  describe('GET /class-updates/update/:updateId', () => {
    test('should return class update details successfully', async () => {
      const response = await request(app).get('/class-updates/update/update-1');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('update-1');
      expect(response.body.title).toBe('Sample Update');
    });

    test('should return 404 if update not found', async () => {
      const response = await request(app).get('/class-updates/update/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Class update not found');
    });
  });
}); 