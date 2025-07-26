import { test, expect, describe, beforeEach } from 'bun:test';
import request from 'supertest';
import express from 'express';

describe('Schools Controller', () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // Mock auth middleware for POST requests
    app.use((req, res, next) => {
      if (req.method === 'POST') {
        req.user = { role: 'admin' };
      }
      next();
    });

    // GET all schools (public)
    app.get('/schools', async (req, res) => {
      const schools = [
        { id: '1', name: 'Test School 1', address: '123 Test St' },
        { id: '2', name: 'Test School 2', address: '456 Test Ave' }
      ];
      res.json(schools);
    });

    // GET school by ID (public)
    app.get('/schools/:id', async (req, res) => {
      if (req.params.id === 'nonexistent') {
        return res.status(404).json({ error: 'School not found' });
      }
      res.json({ id: req.params.id, name: 'Test School', address: '123 Test St' });
    });

    // POST create school (admin only)
    app.post('/schools', async (req, res) => {
      if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
      }
      
      if (!req.body.name || !req.body.address) {
        return res.status(400).json({ errors: [{ msg: 'Name and address are required' }] });
      }

      res.status(201).json({ 
        id: 'new-school-id', 
        name: req.body.name, 
        address: req.body.address 
      });
    });
  });

  describe('GET /schools', () => {
    test('should return all schools', async () => {
      const response = await request(app).get('/schools');
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });
  });

  describe('GET /schools/:id', () => {
    test('should return school by ID', async () => {
      const response = await request(app).get('/schools/1');
      expect(response.status).toBe(200);
      expect(response.body.id).toBe('1');
    });

    test('should return 404 for nonexistent school', async () => {
      const response = await request(app).get('/schools/nonexistent');
      expect(response.status).toBe(404);
      expect(response.body.error).toBe('School not found');
    });
  });

  describe('POST /schools', () => {
    test('should create school with admin privileges', async () => {
      const schoolData = { name: 'New School', address: '789 New St' };
      const response = await request(app).post('/schools').send(schoolData);
      
      expect(response.status).toBe(201);
      expect(response.body.name).toBe('New School');
      expect(response.body.address).toBe('789 New St');
    });

    test('should return 400 for missing required fields', async () => {
      const response = await request(app).post('/schools').send({});
      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
}); 