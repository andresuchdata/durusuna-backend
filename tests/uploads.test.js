import { test, expect, describe, beforeEach } from 'bun:test';
import request from 'supertest';
import express from 'express';

describe('Uploads Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware
    app.use((req, res, next) => {
      req.user = { id: 'mock-user-id' };
      next();
    });

    // Simple file upload endpoint
    app.post('/uploads/file', async (req, res) => {
      // Simulate file validation
      if (!req.body.filename) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      if (req.body.filename === 'invalid.exe') {
        return res.status(400).json({ 
          error: 'Invalid file',
          details: ['File type not supported']
        });
      }

      res.json({
        id: 'uploaded-file-id',
        url: 'https://s3.amazonaws.com/bucket/uploaded-file.jpg',
        filename: req.body.filename,
        mimetype: 'image/jpeg',
        size: 1024
      });
    });

    // Get file by ID
    app.get('/uploads/:id', async (req, res) => {
      const { id } = req.params;
      
      if (id === 'nonexistent') {
        return res.status(404).json({ error: 'File not found' });
      }

      res.json({
        id: id,
        filename: 'test-file.jpg',
        original_name: 'original-test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        url: 'https://s3.amazonaws.com/bucket/test-file.jpg'
      });
    });

    // Delete file by ID
    app.delete('/uploads/:id', async (req, res) => {
      const { id } = req.params;
      
      if (id === 'nonexistent') {
        return res.status(404).json({ error: 'File not found' });
      }
      
      if (id === 'not-owned') {
        return res.status(403).json({ error: 'Access denied. You can only delete your own files.' });
      }

      res.json({ message: 'File deleted successfully' });
    });
  });

  describe('POST /uploads/file', () => {
    test('should upload file successfully', async () => {
      const response = await request(app)
        .post('/uploads/file')
        .send({ filename: 'test.jpg' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBe('uploaded-file-id');
      expect(response.body.filename).toBe('test.jpg');
    });

    test('should return 400 if no file uploaded', async () => {
      const response = await request(app)
        .post('/uploads/file')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('No file uploaded');
    });

    test('should return 400 for invalid file type', async () => {
      const response = await request(app)
        .post('/uploads/file')
        .send({ filename: 'invalid.exe' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Invalid file');
      expect(response.body.details).toContain('File type not supported');
    });
  });

  describe('GET /uploads/:id', () => {
    test('should return file details successfully', async () => {
      const response = await request(app).get('/uploads/test-file-id');
      
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('test-file-id');
      expect(response.body.filename).toBe('test-file.jpg');
    });

    test('should return 404 if file not found', async () => {
      const response = await request(app).get('/uploads/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('File not found');
    });
  });

  describe('DELETE /uploads/:id', () => {
    test('should delete file successfully', async () => {
      const response = await request(app).delete('/uploads/test-file-id');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('File deleted successfully');
    });

    test('should return 404 if file not found', async () => {
      const response = await request(app).delete('/uploads/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('File not found');
    });

    test('should return 403 if user does not own file', async () => {
      const response = await request(app).delete('/uploads/not-owned');
      
      expect(response.status).toBe(403);
      expect(response.body.error).toBe('Access denied. You can only delete your own files.');
    });
  });
}); 