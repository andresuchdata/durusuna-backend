import { Request, Response } from 'express';
import { AssignmentRepository } from '../repositories/assignmentRepository';
import { CustomRequest } from '../types/request';

export class AssignmentController {
  private assignmentRepository: AssignmentRepository;

  constructor() {
    this.assignmentRepository = new AssignmentRepository();
  }

  /**
   * Get assignments for a specific class
   * GET /api/classes/:classId/assignments
   */
  async getClassAssignments(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { classId } = req.params;
      const { 
        page = 1, 
        limit = 10, 
        type,
        status = 'all' // 'all', 'published', 'draft'
      } = req.query;

      const userId = req.user?.id;
      console.log(`🔍 [DEBUG] Assignment request - userId: ${userId}, classId: ${classId}, limit: ${limit}`);
      
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Verify user has access to this class
      const hasAccess = await this.assignmentRepository.checkClassAccess(userId, classId);
      console.log(`🔍 [DEBUG] User access check - hasAccess: ${hasAccess}`);
      
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to this class' });
        return;
      }

      const result = await this.assignmentRepository.getClassAssignments({
        classId,
        page: Number(page),
        limit: Number(limit),
        type: type as string,
        status: status as string,
        userId
      });

      console.log(`🔍 [DEBUG] Assignment query result - total: ${result.total}, assignments count: ${result.assignments.length}`);

      res.json({
        assignments: result.assignments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching class assignments:', error);
      res.status(500).json({ error: 'Failed to fetch class assignments' });
    }
  }

  /**
   * Get recent assignments across all classes for a teacher
   * GET /api/assignments/recent
   */
  async getRecentAssignments(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { limit = 5 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const assignments = await this.assignmentRepository.getRecentAssignments({
        teacherId: userId,
        limit: Number(limit)
      });

      res.json({ assignments });
    } catch (error) {
      console.error('Error fetching recent assignments:', error);
      res.status(500).json({ error: 'Failed to fetch recent assignments' });
    }
  }

  /**
   * Get assignments for a specific subject within a class
   * GET /api/classes/:classId/subjects/:subjectId/assignments
   */
  async getSubjectAssignments(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { classId, subjectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Verify user has access to this class and subject
      const hasAccess = await this.assignmentRepository.checkSubjectAccess(userId, classId, subjectId);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to this subject' });
        return;
      }

      const result = await this.assignmentRepository.getSubjectAssignments({
        classId,
        subjectId,
        page: Number(page),
        limit: Number(limit),
        userId
      });

      res.json({
        assignments: result.assignments,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error fetching subject assignments:', error);
      res.status(500).json({ error: 'Failed to fetch subject assignments' });
    }
  }

  /**
   * Create a new assignment
   * POST /api/classes/:classId/subjects/:subjectId/assignments
   */
  async createAssignment(req: CustomRequest, res: Response): Promise<void> {
    try {
      const { classId, subjectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Verify user can create assignments for this subject
      const canCreate = await this.assignmentRepository.checkTeacherPermission(userId, classId, subjectId);
      if (!canCreate) {
        res.status(403).json({ error: 'Permission denied to create assignments for this subject' });
        return;
      }

      const assignmentData = {
        ...req.body,
        created_by: userId
      };

      const assignment = await this.assignmentRepository.createAssignment(classId, subjectId, assignmentData);

      res.status(201).json({ assignment });
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }
}
