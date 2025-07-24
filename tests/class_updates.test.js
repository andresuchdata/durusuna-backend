const request = require('supertest');
const express = require('express');
const {
  mockDb,
  mockLogger,
  createMockUser,
  createMockClassUpdate,
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
  classUpdateSchema: {},
  commentSchema: {}
}));

// Import the class updates routes after mocking
const classUpdatesRoutes = require('../src/routes/class_updates');

describe('Class Updates Controller', () => {
  let app;
  let mockUser;
  let mockTeacher;
  let mockStudent;
  let mockClassUpdate;

  beforeEach(() => {
    resetMocks();
    app = express();
    app.use(express.json());
    app.use('/class-updates', classUpdatesRoutes);
    
    mockTeacher = createMockUser({ 
      user_type: 'teacher',
      first_name: 'Teacher',
      last_name: 'Smith'
    });
    
    mockStudent = createMockUser({ 
      id: 'student-id',
      user_type: 'student',
      first_name: 'Student',
      last_name: 'Jones'
    });
    
    mockUser = mockTeacher; // Default to teacher for most tests
    mockClassUpdate = createMockClassUpdate({
      author_id: mockTeacher.id,
      class_id: 'test-class-id'
    });
  });

  describe('GET /class-updates/:classId', () => {
    it('should return class updates for valid class', async () => {
      const classId = 'test-class-id';
      const mockUpdates = [mockClassUpdate];

      // Mock user has access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({ 
            user_id: mockUser.id, 
            class_id: classId,
            role_in_class: 'teacher'
          })
        })
      });

      // Mock getting class updates
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockUpdates)
      });

      // Mock getting comment counts
      mockDb.class_update_comments.mockReturnValueOnce({
        ...mockDb,
        whereIn: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue([
          { class_update_id: mockClassUpdate.id, count: '5' }
        ])
      });

      const response = await request(app)
        .get(`/class-updates/${classId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        updates: expect.arrayContaining([
          expect.objectContaining({
            id: mockClassUpdate.id,
            title: mockClassUpdate.title,
            content: mockClassUpdate.content,
            update_type: mockClassUpdate.update_type,
            comments_count: 5
          })
        ]),
        pagination: expect.objectContaining({
          page: 1,
          limit: 20
        })
      });
    });

    it('should return 403 if user has no access to class', async () => {
      const classId = 'restricted-class-id';

      // Mock user has no access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .get(`/class-updates/${classId}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to this class'
      });
    });

    it('should handle pagination parameters', async () => {
      const classId = 'test-class-id';

      // Mock user has access
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({ 
            user_id: mockUser.id, 
            class_id: classId 
          })
        })
      });

      // Mock empty updates
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      });

      // Mock empty comment counts
      mockDb.class_update_comments.mockReturnValueOnce({
        ...mockDb,
        whereIn: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        count: jest.fn().mockResolvedValue([])
      });

      const response = await request(app)
        .get(`/class-updates/${classId}?page=2&limit=10`)
        .expect(200);

      expect(response.body.pagination).toMatchObject({
        page: 2,
        limit: 10,
        hasMore: false
      });
    });
  });

  describe('POST /class-updates/create', () => {
    it('should create class update successfully for teacher', async () => {
      const updateData = {
        class_id: 'test-class-id',
        title: 'New Announcement',
        content: 'This is a test announcement',
        update_type: 'announcement'
      };

      // Mock user has teacher access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_type: 'teacher',
            role_in_class: 'teacher'
          })
        })
      });

      // Mock update creation
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        insert: jest.fn().mockReturnValueOnce({
          returning: jest.fn().mockResolvedValue([mockClassUpdate])
        })
      });

      // Mock getting created update with author info
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            ...mockClassUpdate,
            author_name: mockTeacher.first_name + ' ' + mockTeacher.last_name,
            author_email: mockTeacher.email,
            author_avatar: mockTeacher.avatar_url
          })
        })
      });

      const response = await request(app)
        .post('/class-updates/create')
        .send(updateData)
        .expect(201);

      expect(response.body).toMatchObject({
        update: expect.objectContaining({
          title: updateData.title,
          content: updateData.content,
          update_type: updateData.update_type,
          author: expect.objectContaining({
            id: mockTeacher.id,
            name: expect.stringContaining(mockTeacher.first_name)
          }),
          comments_count: 0
        })
      });
    });

    it('should return 403 if user has no access to class', async () => {
      const updateData = {
        class_id: 'restricted-class-id',
        content: 'Test content',
        update_type: 'announcement'
      };

      // Mock user has no access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .post('/class-updates/create')
        .send(updateData)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to this class'
      });
    });

    it('should return 403 if user is not a teacher', async () => {
      const updateData = {
        class_id: 'test-class-id',
        content: 'Test content',
        update_type: 'announcement'
      };

      // Mock user has student access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_type: 'student',
            role_in_class: 'student'
          })
        })
      });

      const response = await request(app)
        .post('/class-updates/create')
        .send(updateData)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Only teachers can create class updates'
      });
    });

    it('should create update with attachments', async () => {
      const updateData = {
        class_id: 'test-class-id',
        content: 'Check out these attachments',
        update_type: 'homework',
        attachments: [
          { fileName: 'homework.pdf', fileUrl: 'https://example.com/file.pdf' }
        ]
      };

      // Mock teacher access
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_type: 'teacher',
            role_in_class: 'teacher'
          })
        })
      });

      // Mock update creation
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        insert: jest.fn().mockReturnValueOnce({
          returning: jest.fn().mockResolvedValue([mockClassUpdate])
        })
      });

      // Mock getting created update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            ...mockClassUpdate,
            attachments: JSON.stringify(updateData.attachments)
          })
        })
      });

      const response = await request(app)
        .post('/class-updates/create')
        .send(updateData)
        .expect(201);

      expect(response.body.update.attachments).toBeDefined();
    });
  });

  describe('PUT /class-updates/:updateId', () => {
    it('should update class update successfully by author', async () => {
      const updateId = mockClassUpdate.id;
      const updateData = {
        title: 'Updated Title',
        content: 'Updated content',
        update_type: 'homework'
      };

      // Mock getting existing update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockClassUpdate)
      });

      // Mock update operation
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      // Mock getting updated record
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            ...mockClassUpdate,
            ...updateData,
            is_edited: true,
            edited_at: new Date()
          })
        })
      });

      const response = await request(app)
        .put(`/class-updates/${updateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        update: expect.objectContaining({
          title: updateData.title,
          content: updateData.content,
          update_type: updateData.update_type
        })
      });
    });

    it('should return 404 if update not found', async () => {
      const updateId = 'nonexistent-update-id';
      const updateData = {
        content: 'Updated content'
      };

      // Mock update doesn't exist
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .put(`/class-updates/${updateId}`)
        .send(updateData)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Class update not found'
      });
    });

    it('should allow teacher to edit any update in their class', async () => {
      const updateId = mockClassUpdate.id;
      const updateData = { content: 'Teacher edited this' };

      const studentUpdate = {
        ...mockClassUpdate,
        author_id: 'different-author-id'
      };

      // Mock getting update by different author
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(studentUpdate)
      });

      // Mock teacher access check
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_type: 'teacher',
            role_in_class: 'teacher'
          })
        })
      });

      // Mock update operation
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      // Mock getting updated record
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            ...studentUpdate,
            content: updateData.content
          })
        })
      });

      const response = await request(app)
        .put(`/class-updates/${updateId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.update.content).toBe(updateData.content);
    });
  });

  describe('DELETE /class-updates/:updateId', () => {
    it('should delete class update successfully by author', async () => {
      const updateId = mockClassUpdate.id;

      // Mock getting existing update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockClassUpdate)
      });

      // Mock soft delete operation
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .delete(`/class-updates/${updateId}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Class update deleted successfully'
      });
    });

    it('should return 404 if update not found', async () => {
      const updateId = 'nonexistent-update-id';

      // Mock update doesn't exist
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .delete(`/class-updates/${updateId}`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Class update not found'
      });
    });

    it('should return 403 if user is not author and not teacher', async () => {
      const updateId = mockClassUpdate.id;
      const unauthorizedUpdate = {
        ...mockClassUpdate,
        author_id: 'different-author-id'
      };

      // Mock getting update by different author
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(unauthorizedUpdate)
      });

      // Mock student access check
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_type: 'student',
            role_in_class: 'student'
          })
        })
      });

      const response = await request(app)
        .delete(`/class-updates/${updateId}`)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Only the author or class teachers can delete this update'
      });
    });
  });

  describe('GET /class-updates/:updateId/comments', () => {
    it('should return comments for a class update', async () => {
      const updateId = mockClassUpdate.id;
      const mockComments = [
        {
          id: 'comment-1',
          class_update_id: updateId,
          author_id: mockStudent.id,
          content: 'Great update!',
          created_at: new Date(),
          author_name: mockStudent.first_name + ' ' + mockStudent.last_name,
          author_email: mockStudent.email,
          author_avatar: mockStudent.avatar_url
        }
      ];

      // Mock update exists
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockClassUpdate)
      });

      // Mock user has access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_id: mockUser.id,
            class_id: mockClassUpdate.class_id
          })
        })
      });

      // Mock getting comments
      mockDb.class_update_comments.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue(mockComments)
      });

      const response = await request(app)
        .get(`/class-updates/${updateId}/comments`)
        .expect(200);

      expect(response.body).toMatchObject({
        comments: expect.arrayContaining([
          expect.objectContaining({
            content: 'Great update!',
            author: expect.objectContaining({
              id: mockStudent.id
            })
          })
        ]),
        pagination: expect.any(Object)
      });
    });

    it('should return 404 if update not found', async () => {
      const updateId = 'nonexistent-update-id';

      // Mock update doesn't exist
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(null)
      });

      const response = await request(app)
        .get(`/class-updates/${updateId}/comments`)
        .expect(404);

      expect(response.body).toMatchObject({
        error: 'Class update not found'
      });
    });
  });

  describe('POST /class-updates/:updateId/comments', () => {
    it('should add comment to class update successfully', async () => {
      const updateId = mockClassUpdate.id;
      const commentData = {
        content: 'This is a great update!'
      };

      const newComment = {
        id: 'new-comment-id',
        class_update_id: updateId,
        author_id: mockUser.id,
        content: commentData.content,
        created_at: new Date()
      };

      // Mock update exists
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockClassUpdate)
      });

      // Mock user has access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_id: mockUser.id,
            class_id: mockClassUpdate.class_id
          })
        })
      });

      // Mock comment creation
      mockDb.class_update_comments.mockReturnValueOnce({
        ...mockDb,
        insert: jest.fn().mockReturnValueOnce({
          returning: jest.fn().mockResolvedValue([newComment])
        })
      });

      // Mock getting created comment with author info
      mockDb.class_update_comments.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            ...newComment,
            author_name: mockUser.first_name + ' ' + mockUser.last_name,
            author_email: mockUser.email,
            author_avatar: mockUser.avatar_url
          })
        })
      });

      const response = await request(app)
        .post(`/class-updates/${updateId}/comments`)
        .send(commentData)
        .expect(201);

      expect(response.body).toMatchObject({
        comment: expect.objectContaining({
          content: commentData.content,
          author: expect.objectContaining({
            id: mockUser.id,
            name: expect.stringContaining(mockUser.first_name)
          })
        })
      });
    });

    it('should return 403 if user has no access to class', async () => {
      const updateId = mockClassUpdate.id;
      const commentData = {
        content: 'Test comment'
      };

      // Mock update exists
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockClassUpdate)
      });

      // Mock user has no access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue(null)
        })
      });

      const response = await request(app)
        .post(`/class-updates/${updateId}/comments`)
        .send(commentData)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Access denied to this class'
      });
    });
  });

  describe('PUT /class-updates/:updateId/pin', () => {
    it('should toggle pin status successfully for teacher', async () => {
      const updateId = mockClassUpdate.id;
      const pinData = {
        is_pinned: true
      };

      // Mock getting existing update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockClassUpdate)
      });

      // Mock teacher access check
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_type: 'teacher',
            role_in_class: 'teacher'
          })
        })
      });

      // Mock pin update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      // Mock getting updated record
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            ...mockClassUpdate,
            is_pinned: true
          })
        })
      });

      const response = await request(app)
        .put(`/class-updates/${updateId}/pin`)
        .send(pinData)
        .expect(200);

      expect(response.body.update.is_pinned).toBe(true);
    });

    it('should return 403 if user is not a teacher', async () => {
      const updateId = mockClassUpdate.id;
      const pinData = {
        is_pinned: true
      };

      // Mock getting existing update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue(mockClassUpdate)
      });

      // Mock student access check
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        join: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_type: 'student',
            role_in_class: 'student'
          })
        })
      });

      const response = await request(app)
        .put(`/class-updates/${updateId}/pin`)
        .send(pinData)
        .expect(403);

      expect(response.body).toMatchObject({
        error: 'Only teachers can pin/unpin updates'
      });
    });
  });

  describe('POST /class-updates/:updateId/reactions', () => {
    it('should add reaction to class update successfully', async () => {
      const updateId = mockClassUpdate.id;
      const reactionData = {
        emoji: '👍'
      };

      // Mock getting existing update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          ...mockClassUpdate,
          reactions: JSON.stringify({})
        })
      });

      // Mock user has access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_id: mockUser.id,
            class_id: mockClassUpdate.class_id
          })
        })
      });

      // Mock reaction update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .post(`/class-updates/${updateId}/reactions`)
        .send(reactionData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Reaction added successfully'
      });
    });

    it('should return 400 if emoji is missing', async () => {
      const updateId = mockClassUpdate.id;
      const reactionData = {};

      const response = await request(app)
        .post(`/class-updates/${updateId}/reactions`)
        .send(reactionData)
        .expect(400);

      expect(response.body).toMatchObject({
        error: 'Emoji is required'
      });
    });
  });

  describe('DELETE /class-updates/:updateId/reactions', () => {
    it('should remove reaction from class update successfully', async () => {
      const updateId = mockClassUpdate.id;
      const reactionData = {
        emoji: '👍'
      };

      // Mock getting existing update with reactions
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnThis(),
        first: jest.fn().mockResolvedValue({
          ...mockClassUpdate,
          reactions: JSON.stringify({ '👍': 2, '❤️': 1 })
        })
      });

      // Mock user has access to class
      mockDb.user_classes.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          first: jest.fn().mockResolvedValue({
            user_id: mockUser.id,
            class_id: mockClassUpdate.class_id
          })
        })
      });

      // Mock reaction update
      mockDb.class_updates.mockReturnValueOnce({
        ...mockDb,
        where: jest.fn().mockReturnValueOnce({
          update: jest.fn().mockResolvedValue()
        })
      });

      const response = await request(app)
        .delete(`/class-updates/${updateId}/reactions`)
        .send(reactionData)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Reaction removed successfully'
      });
    });
  });
}); 