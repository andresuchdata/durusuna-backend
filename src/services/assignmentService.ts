import { Request, Response } from 'express';
import { AssignmentRepository } from '../repositories/assignmentRepository';
import { UserRepository } from '../repositories/userRepository';
import { AuthenticatedRequest } from '../types/auth';
import { AssignmentPresenter } from '../presenters/assignmentPresenter';
import knex from '../shared/database/connection';

export class AssignmentService {
  private assignmentRepository: AssignmentRepository;
  private userRepository: UserRepository;

  constructor() {
    this.assignmentRepository = new AssignmentRepository();
    this.userRepository = new UserRepository(knex);
  }

  /**
   * Get assignments for a specific class
   * GET /api/classes/:classId/assignments
   */
  async getClassAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      if (!classId) {
        res.status(400).json({ error: 'Class ID is required' });
        return;
      }

      // Verify user has access to this class
      const hasAccess = await this.assignmentRepository.checkClassAccess(userId!, classId);
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
        userId: userId!
      });

      console.log(`🔍 [DEBUG] Assignment query result - total: ${result.total}, assignments count: ${result.assignments.length}`);

      res.json(AssignmentPresenter.formatAssignmentListResponse({
        assignments: result.assignments,
        total: result.total,
        page: Number(page),
        limit: Number(limit),
      }));
    } catch (error) {
      console.error('Error fetching class assignments:', error);
      res.status(500).json({ error: 'Failed to fetch class assignments' });
    }
  }

  /**
   * Get recent assignments across all classes for a teacher
   * GET /api/assignments/recent
   */
  async getRecentAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
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

      res.json({ 
        assignments: AssignmentPresenter.formatAssignments(assignments) 
      });
    } catch (error) {
      console.error('Error fetching recent assignments:', error);
      res.status(500).json({ error: 'Failed to fetch recent assignments' });
    }
  }

  /**
   * Get assignments for a specific subject within a class
   * GET /api/classes/:classId/subjects/:subjectId/assignments
   */
  async getSubjectAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { classId, subjectId } = req.params;
      const { page = 1, limit = 10 } = req.query;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!classId || !subjectId) {
        res.status(400).json({ error: 'Class ID and Subject ID are required' });
        return;
      }

      // Verify user has access to this class and subject
      const hasAccess = await this.assignmentRepository.checkSubjectAccess(userId!, classId!, subjectId!);
      if (!hasAccess) {
        res.status(403).json({ error: 'Access denied to this subject' });
        return;
      }

      const result = await this.assignmentRepository.getSubjectAssignments({
        classId: classId!,
        subjectId: subjectId!,
        page: Number(page),
        limit: Number(limit),
        userId: userId!
      });

      res.json(AssignmentPresenter.formatAssignmentListResponse({
        assignments: result.assignments,
        total: result.total,
        page: Number(page),
        limit: Number(limit),
      }));
    } catch (error) {
      console.error('Error fetching subject assignments:', error);
      res.status(500).json({ error: 'Failed to fetch subject assignments' });
    }
  }

  /**
   * Create a new assignment
   * POST /api/classes/:classId/subjects/:subjectId/assignments
   */
  async createAssignment(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { classId, subjectId } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      if (!classId || !subjectId) {
        res.status(400).json({ error: 'Class ID and Subject ID are required' });
        return;
      }

      // Verify user can create assignments for this subject
      const canCreate = await this.assignmentRepository.checkTeacherPermission(userId!, classId!, subjectId!);
      if (!canCreate) {
        res.status(403).json({ error: 'Permission denied to create assignments for this subject' });
        return;
      }

      const assignmentData = {
        ...req.body,
        created_by: userId!
      };

      const assignment = await this.assignmentRepository.createAssignment(classId!, subjectId!, assignmentData);

      res.status(201).json({ 
        assignment: AssignmentPresenter.formatCreatedAssignment(assignment) 
      });
    } catch (error) {
      console.error('Error creating assignment:', error);
      res.status(500).json({ error: 'Failed to create assignment' });
    }
  }

  /**
   * Get assignments for the current user based on their role and enrollments
   * GET /api/assignments/user/assignments
   */
  async getUserAssignments(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        limit = 50, 
        type,
        status = 'published', // Default to published for students/parents
        search,
        subject_id
      } = req.query;

      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      const result = await this.assignmentRepository.getUserAssignments({
        userId,
        page: Number(page),
        limit: Number(limit),
        type: type as string,
        status: status as string,
        search: search as string,
        subjectId: subject_id as string,
      });

      res.json(AssignmentPresenter.formatAssignmentListResponse({
        assignments: result.assignments,
        total: result.total,
        page: Number(page),
        limit: Number(limit),
      }));
    } catch (error) {
      console.error('Error fetching user assignments:', error);
      res.status(500).json({ error: 'Failed to fetch user assignments' });
    }
  }

  /**
   * Get accessible subjects for a teacher
   * GET /api/assignments/teacher/accessible-subjects
   */
  async getTeacherAccessibleSubjects(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Verify user is a teacher
      const user = await this.userRepository.findById(userId!);
      if (!user || user.user_type !== 'teacher') {
        res.status(403).json({ error: 'Access denied. Teachers only.' });
        return;
      }

      const subjects = await this.assignmentRepository.getTeacherAccessibleSubjectsUnique(userId!);

      res.json({
        subjects: AssignmentPresenter.formatTeacherAccessibleSubjects(subjects),
        total: subjects.length
      });
    } catch (error) {
      console.error('Error fetching teacher accessible subjects:', error);
      res.status(500).json({ error: 'Failed to fetch accessible subjects' });
    }
  }

  /**
   * Get accessible classes for a teacher
   * GET /api/assignments/teacher/accessible-classes
   */
  async getTeacherAccessibleClasses(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'User not authenticated' });
        return;
      }

      // Verify user is a teacher
      const user = await this.userRepository.findById(userId!);
      if (!user || user.user_type !== 'teacher') {
        res.status(403).json({ error: 'Access denied. Teachers only.' });
        return;
      }

      // Get unique classes where teacher has access
      const accessibleClasses = await this.assignmentRepository.getTeacherAccessibleClasses(userId!);

      res.json({
        classes: AssignmentPresenter.formatTeacherAccessibleClasses(accessibleClasses),
        total: accessibleClasses.length
      });
    } catch (error) {
      console.error('Error fetching teacher accessible classes:', error);
      res.status(500).json({ error: 'Failed to fetch accessible classes' });
    }
  }
}
