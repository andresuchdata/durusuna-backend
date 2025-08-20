import express, { Request, Response } from 'express';
import { AssignmentService } from '../services/assignmentService';
import { authenticate } from '../shared/middleware/auth';
import { AuthenticatedRequest } from '../types/auth';

const router = express.Router();
const assignmentService = new AssignmentService();

/**
 * @route GET /api/assignments/recent
 * @desc Get recent assignments for the current teacher
 * @access Private (Teachers only)
 */
router.get('/recent', authenticate, async (req: Request, res: Response) => {
  await assignmentService.getRecentAssignments(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/assignments/user/assignments
 * @desc Get assignments for the current user based on their role and enrollments
 * @access Private
 */
router.get('/user/assignments', authenticate, async (req: Request, res: Response) => {
  await assignmentService.getUserAssignments(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/assignments/:assignmentId/details
 * @desc Get assignment details with student submissions
 * @access Private (Teachers only)
 */
router.get('/:assignmentId/details', authenticate, async (req: Request, res: Response) => {
  await assignmentService.getAssignmentDetails(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/classes/:classId/assignments
 * @desc Get all assignments for a specific class
 * @access Private
 */
router.get('/classes/:classId/assignments', authenticate, async (req: Request, res: Response) => {
  await assignmentService.getClassAssignments(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/classes/:classId/subjects/:subjectId/assignments
 * @desc Get assignments for a specific subject within a class
 * @access Private
 */
router.get('/classes/:classId/subjects/:subjectId/assignments', authenticate, async (req: Request, res: Response) => {
  await assignmentService.getSubjectAssignments(req as AuthenticatedRequest, res);
});

/**
 * @route POST /api/classes/:classId/subjects/:subjectId/assignments
 * @desc Create a new assignment for a specific subject
 * @access Private (Teachers only)
 */
router.post('/classes/:classId/subjects/:subjectId/assignments', authenticate, async (req: Request, res: Response) => {
  await assignmentService.createAssignment(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/assignments/teacher/accessible-subjects
 * @desc Get subjects accessible by the current teacher
 * @access Private (Teachers only)
 */
router.get('/teacher/accessible-subjects', authenticate, async (req: Request, res: Response) => {
  await assignmentService.getTeacherAccessibleSubjects(req as AuthenticatedRequest, res);
});

/**
 * @route GET /api/assignments/teacher/accessible-classes
 * @desc Get classes accessible by the current teacher
 * @access Private (Teachers only)
 */
router.get('/teacher/accessible-classes', authenticate, async (req: Request, res: Response) => {
  await assignmentService.getTeacherAccessibleClasses(req as AuthenticatedRequest, res);
});

export default router;
