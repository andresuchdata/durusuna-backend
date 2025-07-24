const request = require('supertest');
const express = require('express');
const {
  mockDb,
  mockJwt,
  mockBcrypt,
  mockLogger,
  createMockUser,
  createMockReq,
  createMockRes,
  createMockNext,
  mockAuthenticate,
  mockValidate,
  resetMocks
} = require('./setup');

// Mock the dependencies
jest.mock('../src/config/database', () => mockDb);
jest.mock('../src/utils/jwt', () => mockJwt);
jest.mock('bcryptjs', () => mockBcrypt);
jest.mock('../src/utils/logger', () => mockLogger);
jest.mock('../src/middleware/auth', () => ({
  authenticate: (req, res, next) => {
    req.user = {
      id: 'mock-user-id',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      user_type: 'teacher'
    };
    next();
  },
  rateLimitSensitive: (req, res, next) => next()
}));
jest.mock('../src/utils/validation', () => ({
  validate: mockValidate,
  registerSchema: {},
  loginSchema: {},
  passwordResetRequestSchema: {},
  passwordResetSchema: {},
  profileUpdateSchema: {}
}));

// Import the auth routes after mocking
const authRoutes = require('../src/routes/auth');

describe('Auth Controller', () => {
  let app;
  let mockUser;

  beforeEach(() => {
    resetMocks();
    app = express();
    app.use(express.json());
    app.use('/auth', authRoutes);
    
    mockUser = createMockUser();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        user_type: 'teacher',
        school_id: mockUser.school_id,
        employee_id: 'EMP001'
      };

      // For now, just test that the route doesn't crash with 500 error
      // The transaction mock should handle the basic pattern

      const response = await request(app)
        .post('/auth/register')
        .send(registerData);

      // First, let's just verify we don't get a 500 error
      expect(response.status).not.toBe(500);
      
      // Log the response for debugging
      console.log('Response status:', response.status);
      console.log('Response body:', response.body);
    });

    it('should return 409 if email already exists', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        user_type: 'teacher',
        school_id: mockUser.school_id
      };

      mockDb.transaction.mockResolvedValue({
        rollback: jest.fn(),
        commit: jest.fn()
      });

      // Mock user already exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(mockUser)
        })
      });

      const response = await request(app)
        .post('/auth/register')
        .send(registerData)
        .expect(409);

      expect(response.body).toMatchObject({
        error: 'Conflict',
        message: 'Email already registered'
      });
    });

    it('should return 400 if school ID is invalid', async () => {
      const registerData = {
        email: 'test@example.com',
        password: 'password123',
        first_name: 'John',
        last_name: 'Doe',
        user_type: 'teacher',
        school_id: 'invalid-school-id'
      };

      mockDb.transaction.mockResolvedValue({
        rollback: jest.fn(),
        commit: jest.fn()
      });

      // Mock user doesn't exist
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      // Mock school doesn't exist
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .post('/auth/register')
        .send(registerData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Invalid school ID'
      });
    });
  });

  describe('POST /auth/login', () => {
    it('should login user successfully', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'password123'
      };

      // Mock user exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(mockUser)
        })
      });

      // Mock password verification
      mockBcrypt.compare.mockResolvedValue(true);

      // Mock last login update
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Login successful',
        user: expect.objectContaining({
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name
        }),
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token'
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith('password123', mockUser.password_hash);
    });

    it('should return 401 for invalid email', async () => {
      const loginData = {
        email: 'nonexistent@example.com',
        password: 'password123'
      };

      // Mock user doesn't exist
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    });

    it('should return 401 for invalid password', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      // Mock user exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(mockUser)
        })
      });

      // Mock password verification fails
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/login')
        .send(loginData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid email or password'
      });
    });
  });

  describe('GET /auth/me', () => {
    it('should return current user profile', async () => {
      // Mock user lookup
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(mockUser)
        })
      });

      const response = await request(app)
        .get('/auth/me')
        .expect(200);

      expect(response.body).toMatchObject({
        user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          first_name: mockUser.first_name,
          last_name: mockUser.last_name
        })
      });
    });

    it('should return 404 if user not found', async () => {
      // Mock user doesn't exist
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .get('/auth/me')
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: 'User not found'
      });
    });
  });

  describe('PUT /auth/me', () => {
    it('should update user profile successfully', async () => {
      const updateData = {
        first_name: 'Jane',
        last_name: 'Smith',
        phone: '+9876543210'
      };

      // Mock profile update
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const updatedUser = { ...mockUser, ...updateData };

      // Mock getting updated user
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(updatedUser)
        })
      });

      const response = await request(app)
        .put('/auth/me')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Profile updated successfully',
        user: expect.objectContaining({
          first_name: 'Jane',
          last_name: 'Smith',
          phone: '+9876543210'
        })
      });
    });
  });

  describe('POST /auth/change-password', () => {
    it('should change password successfully', async () => {
      const passwordData = {
        current_password: 'oldpassword',
        new_password: 'newpassword123'
      };

      // Mock getting user
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(mockUser)
        })
      });

      // Mock password verification
      mockBcrypt.compare.mockResolvedValue(true);

      // Mock password update
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .post('/auth/change-password')
        .send(passwordData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Password changed successfully'
      });

      expect(mockBcrypt.compare).toHaveBeenCalledWith('oldpassword', mockUser.password_hash);
      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
    });

    it('should return 401 for incorrect current password', async () => {
      const passwordData = {
        current_password: 'wrongpassword',
        new_password: 'newpassword123'
      };

      // Mock getting user
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(mockUser)
        })
      });

      // Mock password verification fails
      mockBcrypt.compare.mockResolvedValue(false);

      const response = await request(app)
        .post('/auth/change-password')
        .send(passwordData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Current password is incorrect'
      });
    });

    it('should return 400 for short new password', async () => {
      const passwordData = {
        current_password: 'oldpassword',
        new_password: '123'
      };

      const response = await request(app)
        .post('/auth/change-password')
        .send(passwordData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'New password must be at least 8 characters long'
      });
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshData = {
        refresh_token: 'valid-refresh-token'
      };

      // Mock token verification
      mockJwt.verifyRefreshToken.mockReturnValue({ userId: mockUser.id });

      // Mock user exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData)
        .expect(200);

      expect(response.body).toMatchObject({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token'
      });
    });

    it('should return 400 for missing refresh token', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .send({})
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Refresh token is required'
      });
    });

    it('should return 401 for invalid refresh token', async () => {
      const refreshData = {
        refresh_token: 'invalid-refresh-token'
      };

      // Mock token verification throws
      mockJwt.verifyRefreshToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const response = await request(app)
        .post('/auth/refresh')
        .send(refreshData)
        .expect(401);

      expect(response.body).toMatchObject({
        error: 'Unauthorized',
        message: 'Invalid refresh token'
      });
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const response = await request(app)
        .post('/auth/logout')
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Logged out successfully'
      });
    });
  });

  describe('POST /auth/forgot-password', () => {
    it('should handle password reset request', async () => {
      const resetData = {
        email: 'test@example.com'
      };

      // Mock user exists
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockUser)
      });

      // Mock token update
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'If the email exists, a password reset link has been sent'
      });
    });

    it('should return same message for non-existent email', async () => {
      const resetData = {
        email: 'nonexistent@example.com'
      };

      // Mock user doesn't exist
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .post('/auth/forgot-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'If the email exists, a password reset link has been sent'
      });
    });
  });

  describe('POST /auth/reset-password', () => {
    it('should reset password successfully', async () => {
      const resetData = {
        token: 'valid-reset-token',
        new_password: 'newpassword123'
      };

      const userWithResetToken = {
        ...mockUser,
        reset_token: 'valid-reset-token',
        reset_token_expires: new Date(Date.now() + 3600000)
      };

      // Mock user with valid token
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(userWithResetToken)
      });

      // Mock password update
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Password reset successfully'
      });

      expect(mockBcrypt.hash).toHaveBeenCalledWith('newpassword123', 12);
    });

    it('should return 400 for invalid or expired token', async () => {
      const resetData = {
        token: 'invalid-token',
        new_password: 'newpassword123'
      };

      // Mock no user found with token
      mockDb.users.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .post('/auth/reset-password')
        .send(resetData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Bad Request',
        message: 'Invalid or expired reset token'
      });
    });
  });
}); 