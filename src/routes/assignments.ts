import express, { Response } from 'express';
import { AssignmentController } from '../controllers/assignmentController';
import { authenticate } from '../shared/middleware/auth';
import { AuthenticatedRequest } from '../types/auth';

const router = express.Router();
const assignmentController = new AssignmentController();

/**
 * @route GET /api/assignments/recent
 * @desc Get recent assignments for the current teacher
 * @access Private (Teachers only)
 */
router.get('/recent', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await assignmentController.getRecentAssignments(req, res);
});

/**
 * @route GET /api/assignments/user/assignments
 * @desc Get assignments for the current user based on their role and enrollments
 * @access Private
 */
router.get('/user/assignments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await assignmentController.getUserAssignments(req, res);
});

/**
 * @route GET /api/classes/:classId/assignments
 * @desc Get all assignments for a specific class
 * @access Private
 */
router.get('/classes/:classId/assignments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await assignmentController.getClassAssignments(req, res);
});

/**
 * @route GET /api/classes/:classId/subjects/:subjectId/assignments
 * @desc Get assignments for a specific subject within a class
 * @access Private
 */
router.get('/classes/:classId/subjects/:subjectId/assignments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await assignmentController.getSubjectAssignments(req, res);
});

/**
 * @route POST /api/classes/:classId/subjects/:subjectId/assignments
 * @desc Create a new assignment for a specific subject
 * @access Private (Teachers only)
 */
router.post('/classes/:classId/subjects/:subjectId/assignments', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  await assignmentController.createAssignment(req, res);
});

export default router;
