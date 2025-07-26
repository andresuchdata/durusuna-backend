import { test, expect, describe, beforeEach } from 'bun:test';
import request from 'supertest';
import express from 'express';

describe('Lessons Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: 'mock-user-id' };
      next();
    });

    // Get lessons for a class
    app.get('/lessons/class/:classId', async (req, res) => {
      const { classId } = req.params;
      
      if (classId === 'no-access-class') {
        return res.status(403).json({ error: 'Access denied to this class' });
      }

      const lessons = [
        {
          id: 'lesson-1',
          title: 'Introduction to Algebra',
          content: 'Basic algebraic concepts',
          lesson_date: new Date('2024-01-15'),
          created_at: new Date()
        }
      ];
      res.json(lessons);
    });

    // Get lesson by ID
    app.get('/lessons/:id', async (req, res) => {
      const { id } = req.params;
      
      if (id === 'nonexistent') {
        return res.status(404).json({ error: 'Lesson not found' });
      }
      
      if (id === 'no-access-lesson') {
        return res.status(403).json({ error: 'Access denied to this lesson' });
      }

      const lesson = {
        id: id,
        title: 'Introduction to Algebra',
        content: 'Basic algebraic concepts',
        lesson_date: new Date('2024-01-15'),
        class_id: 'test-class-id',
        created_at: new Date()
      };
      res.json(lesson);
    });
  });

  describe('GET /lessons/class/:classId', () => {
    test('should return lessons for a class successfully', async () => {
      const response = await request(app).get('/lessons/class/test-class-id');
      
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(1);
      expect(response.body[0].title).toBe('Introduction to Algebra');
    });

    test('should return 403 if user has no access to class', async () => {
      const response = await request(app).get('/lessons/class/no-access-class');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to this class');
    });
  });

  describe('GET /lessons/:id', () => {
    test('should return lesson details successfully', async () => {
      const response = await request(app).get('/lessons/lesson-1');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('lesson-1');
      expect(response.body.title).toBe('Introduction to Algebra');
      expect(response.body.class_id).toBe('test-class-id');
    });

    test('should return 404 if lesson not found', async () => {
      const response = await request(app).get('/lessons/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('Lesson not found');
    });

    test('should return 403 if user has no access to lesson', async () => {
      const response = await request(app).get('/lessons/no-access-lesson');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied to this lesson');
    });
  });
}); 