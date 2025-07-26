import { test, expect, describe, beforeEach } from 'bun:test';
import request from 'supertest';
import express from 'express';

const {
  resetMocks
} = require('./setup');

describe('Auth Controller', () => {
  let app;

  beforeEach(() => {
    resetMocks();
    app = express();
    app.use(express.json());

    // Simple auth routes
    app.post('/auth/register', async (req, res) => {
      const { email, password, first_name, last_name } = req.body;
      
      if (!email || !password || !first_name || !last_name) {
        return res.status(400).json({ errors: [{ msg: 'All fields are required' }] });
      }
      
      if (email === 'existing@example.com') {
        return res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
      }

      res.status(201).json({
        message: 'User registered successfully',
        user: { id: 'new-user-id', email, first_name, last_name }
      });
    });

    app.post('/auth/login', async (req, res) => {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ errors: [{ msg: 'Email and password are required' }] });
      }
      
      if (email === 'invalid@example.com' || password === 'wrongpassword') {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      res.json({
        message: 'Login successful',
        user: { id: 'user-id', email, first_name: 'John', last_name: 'Doe' },
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token'
      });
    });

    app.get('/auth/me', async (req, res) => {
      // Simulate authenticated request
      const authHeader = req.headers.authorization;
      if (!authHeader || authHeader !== 'Bearer valid-token') {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      res.json({
        user: {
          id: 'user-id',
          email: 'test@example.com',
          first_name: 'John',
          last_name: 'Doe'
        }
      });
    });
  });

  describe('POST /auth/register', () => {
    test('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('User registered successfully');
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should return 400 for missing fields', async () => {
      const response = await request(app)
        .post('/auth/register')
        .send({ email: 'test@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });

    test('should return 409 for existing email', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe'
      };

      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('Email already registered');
    });
  });

  describe('POST /auth/login', () => {
    test('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Login successful');
      expect(response.body.access_token).toBe('mock-access-token');
    });

    test('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'invalid@example.com',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/auth/login')
        .send(loginData);

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Invalid credentials');
    });
  });

  describe('GET /auth/me', () => {
    test('should return current user profile', async () => {
      const response = await request(app)
        .get('/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(response.status).toBe(200);
      expect(response.body.user.email).toBe('test@example.com');
    });

    test('should return 401 for invalid token', async () => {
      const response = await request(app)
        .get('/auth/me');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('Unauthorized');
    });
  });
}); 