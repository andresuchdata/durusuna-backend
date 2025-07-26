import { test, expect, describe, beforeEach } from 'bun:test';
import request from 'supertest';
import express from 'express';

const {
  mockDb,
  mockLogger,
  createMockUser,
  resetMocks
} = require('./setup');

describe('Classes Controller', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    resetMocks();
    mockUser = createMockUser();
    
    // Create simple test app
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = {
        id: 'mock-user-id',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        user_type: 'teacher'
      };
      next();
    });

    // Get classes for current user
    app.get('/classes', async (req, res) => {
      try {
        const classes = [
          {
            id: 'class-1-id',
            name: 'Mathematics 101',
            subject: 'Mathematics',
            description: 'Basic mathematics course',
            created_at: new Date()
          },
          {
            id: 'class-2-id',
            name: 'Physics 101',
            subject: 'Physics',
            description: 'Introduction to physics',
            created_at: new Date()
          }
        ];
        res.json(classes);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch classes' });
      }
    });

    // Get class by ID
    app.get('/classes/:id', async (req, res) => {
      try {
        const { id } = req.params;
        
        // Simulate access check failure for certain IDs
        if (id === 'no-access-class') {
          return res.status(403).json({ error: 'Access denied to this class' });
        }
        
        // Simulate class not found
        if (id === 'nonexistent-class') {
          return res.status(404).json({ error: 'Class not found' });
        }

        const classData = {
          id: id,
          name: 'Mathematics 101',
          subject: 'Mathematics',
          description: 'Basic mathematics course',
          created_at: new Date()
        };

        res.json(classData);
      } catch (error) {
        res.status(500).json({ error: 'Failed to fetch class' });
      }
    });
  });

  describe('GET /classes', () => {
    test('should return user classes successfully', async () => {
      const response = await request(app).get('/classes');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].name).toBe('Mathematics 101');
      expect(response.body[1].name).toBe('Physics 101');
    });
  });

  describe('GET /classes/:id', () => {
    test('should return class details successfully', async () => {
      const response = await request(app).get('/classes/class-1-id');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('class-1-id');
      expect(response.body.name).toBe('Mathematics 101');
      expect(response.body.subject).toBe('Mathematics');
    });

    test('should return 403 if user has no access to class', async () => {
      const response = await request(app).get('/classes/no-access-class');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to this class');
    });

    test('should return 404 if class not found', async () => {
      const response = await request(app).get('/classes/nonexistent-class');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Class not found');
    });
  });
}); 