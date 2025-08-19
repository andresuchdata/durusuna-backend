import express, { Request, Response, NextFunction } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { AttendanceRepository } from '../repositories/attendanceRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import { authenticate } from '../shared/middleware/auth';
import { AuthenticatedRequest } from '../types/auth';
import {
  CreateAttendanceRecordRequest,
  BulkUpdateAttendanceRequest,
  StudentAttendanceRequest
} from '../types/attendance';
import logger from '../shared/utils/logger';
import {
  presentAttendanceRecord,
  presentAttendanceRecords,
  presentAttendanceSession,
  presentStudentsWithAttendance,
} from '../presenters/attendancePresenter';
import db from '../shared/database/connection';

const router = express.Router();

// Initialize service layer
const attendanceRepository = new AttendanceRepository(db);
const userClassRepository = new UserClassRepository(db);
const attendanceService = new AttendanceService(attendanceRepository, userClassRepository);

/**
 * @route GET /api/attendance/settings/:schoolId
 * @desc Get school attendance settings
 * @access Private (Any authenticated user belonging to the school)
 */
router.get('/settings/:schoolId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { schoolId } = req.params;
    
    if (!schoolId) {
      return res.status(400).json({ error: 'School ID is required' });
    }

    // Verify the user belongs to this school (admin/teacher/student)
    if (authenticatedReq.user.school_id !== schoolId) {
      return res.status(403).json({ error: 'Access denied - user not in this school' });
    }

    const settings = await attendanceService.getSchoolAttendanceSettings(schoolId);
    res.json({ settings });
  } catch (error) {
    logger.error('Error fetching attendance settings:', error);
    res.status(500).json({ error: 'Failed to fetch attendance settings' });
  }
});

/**
 * @route PUT /api/attendance/settings/:schoolId
 * @desc Update school attendance settings
 * @access Private (Admin only)
 */
router.put('/settings/:schoolId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { schoolId } = req.params;
    const settings = req.body;

    // Debug logging
    logger.info('🔧 PUT /attendance/settings/:schoolId called', {
      schoolId,
      user: authenticatedReq.user?.email,
      role: authenticatedReq.user?.role,
      userSchoolId: authenticatedReq.user?.school_id,
      requestBody: settings
    });

    if (!schoolId) {
      logger.error('❌ School ID is missing');
      return res.status(400).json({ error: 'School ID is required' });
    }

    const updatedSettings = await attendanceService.updateSchoolAttendanceSettings(
      schoolId,
      settings,
      authenticatedReq.user
    );

    logger.info('✅ Attendance settings updated successfully', { schoolId });
    res.json({ 
      message: 'Attendance settings updated successfully',
      settings: updatedSettings 
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      logger.error('❌ Access denied error:', error.message);
      return res.status(403).json({ error: error.message });
    }

    logger.error('❌ Error updating attendance settings:', {
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
      schoolId: req.params.schoolId,
      user: authenticatedReq.user?.email
    });
    res.status(500).json({ error: 'Failed to update attendance settings' });
  }
});

/**
 * @route GET /api/attendance/student/status/:classId
 * @desc Check if student has already marked attendance for today in a specific class
 * @access Private (Students only)
 */
router.get('/student/status/:classId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const userId = authenticatedReq.user.id;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    const attendanceStatus = await attendanceService.getStudentAttendanceStatusForToday(
      classId,
      userId,
      today
    );

    res.json({
      classId,
      hasAttendance: attendanceStatus !== null,
      attendance: attendanceStatus,
      date: today.toISOString().split('T')[0]
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    logger.error('Error checking student attendance status:', error);
    res.status(500).json({ error: 'Failed to check attendance status' });
  }
});

/**
 * @route POST /api/attendance/sessions/:classId/open
 * @desc Open attendance session for a class on a specific date
 * @access Private (Teachers only)
 */
router.post('/sessions/:classId/open', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const { date } = req.body; // YYYY-MM-DD format

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0); // Normalize to start of day

    const result = await attendanceService.openAttendanceSession(
      classId,
      sessionDate,
      authenticatedReq.user
    );

    res.json({
      message: 'Attendance session opened successfully',
      session: presentAttendanceSession(result.session),
      students: presentStudentsWithAttendance(result.students)
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found')) {
        return res.status(404).json({ error: error.message });
      }
    }

    logger.error('Error opening attendance session:', error);
    res.status(500).json({ error: 'Failed to open attendance session' });
  }
});

/**
 * @route POST /api/attendance/:classId/mark/:studentId
 * @desc Mark attendance for a specific student
 * @access Private (Teachers only)
 */
router.post('/mark/:classId/:studentId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId, studentId } = req.params;
    const { date, ...attendanceData }: { date: string } & CreateAttendanceRecordRequest = req.body;

    if (!classId || !studentId) {
      return res.status(400).json({ error: 'Class ID and Student ID are required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const record = await attendanceService.markStudentAttendance(
      classId,
      studentId,
      attendanceDate,
      attendanceData,
      authenticatedReq.user
    );

    res.json({
      message: 'Attendance marked successfully',
      record: presentAttendanceRecord(record)
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not found')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error('Error marking attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

/**
 * @route DELETE /api/attendance/:classId/:studentId
 * @desc Delete/reset attendance for a specific student
 * @access Private (Teachers only)
 */
router.delete('/:classId/:studentId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId, studentId } = req.params;
    const { date } = req.query as { date: string };

    if (!classId || !studentId) {
      return res.status(400).json({ error: 'Class ID and Student ID are required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    await attendanceService.deleteStudentAttendance(
      classId,
      studentId,
      attendanceDate,
      authenticatedReq.user
    );

    res.json({
      message: 'Attendance deleted successfully'
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied') || error.message.includes('not found')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error('Error deleting attendance:', error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

/**
 * @route POST /api/attendance/:classId/bulk-update
 * @desc Bulk update attendance for multiple students
 * @access Private (Teachers only)
 */
router.post('/bulk-update/:classId', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const { date, ...bulkData }: { date: string } & BulkUpdateAttendanceRequest = req.body;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    if (!bulkData.records || !Array.isArray(bulkData.records)) {
      return res.status(400).json({ error: 'Records array is required' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const records = await attendanceService.bulkUpdateAttendance(
      classId,
      attendanceDate,
      bulkData,
      authenticatedReq.user
    );

    res.json({
      message: 'Bulk attendance update completed successfully',
      updated_count: records.length,
      records: presentAttendanceRecords(records)
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
    }

    logger.error('Error in bulk attendance update:', error);
    res.status(500).json({ error: 'Failed to update attendance' });
  }
});

/**
 * @route POST /api/attendance/sessions/:classId/finalize
 * @desc Finalize attendance session for a class
 * @access Private (Teachers only)
 */
router.post('/sessions/:classId/finalize', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const { date } = req.body;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (!date) {
      return res.status(400).json({ error: 'Date is required' });
    }

    const sessionDate = new Date(date);
    sessionDate.setHours(0, 0, 0, 0);

    const session = await attendanceService.finalizeAttendance(
      classId,
      sessionDate,
      authenticatedReq.user
    );

    res.json({
      message: 'Attendance session finalized successfully',
      session: presentAttendanceSession(session)
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('not found') || error.message.includes('already finalized')) {
        return res.status(400).json({ error: error.message });
      }
    }

    logger.error('Error finalizing attendance session:', error);
    res.status(500).json({ error: 'Failed to finalize attendance session' });
  }
});

/**
 * @route POST /api/attendance/student/mark
 * @desc Student marks their own attendance via GPS
 * @access Private (Students only)
 */
router.post('/student/mark', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const requestData: StudentAttendanceRequest = req.body;

    if (!requestData.class_id) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    const record = await attendanceService.markStudentAttendanceGPS(
      requestData,
      authenticatedReq.user
    );

    const presented = presentAttendanceRecord(record);
    res.json({
      message: 'Attendance marked successfully',
      record: presented,
      status: presented.status
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('Access denied')) {
        return res.status(403).json({ error: error.message });
      }
      if (error.message.includes('already marked')) {
        return res.status(409).json({ error: error.message });
      }
      if (error.message.includes('Location verification failed')) {
        // Outside geofence
        return res.status(422).json({ error: error.message });
      }
      if (error.message.includes('GPS location is required')) {
        return res.status(400).json({ error: error.message });
      }
    }

    logger.error('Error in student GPS attendance:', error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

/**
 * @route GET /api/attendance/:classId/stats
 * @desc Get attendance statistics for a specific date
 * @access Private
 */
router.get('/:classId/stats', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const { date } = req.query;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (!date || typeof date !== 'string') {
      return res.status(400).json({ error: 'Date query parameter is required' });
    }

    const attendanceDate = new Date(date);
    attendanceDate.setHours(0, 0, 0, 0);

    const stats = await attendanceService.getAttendanceStats(
      classId,
      attendanceDate,
      authenticatedReq.user
    );

    res.json({ stats });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    logger.error('Error fetching attendance stats:', error);
    res.status(500).json({ error: 'Failed to fetch attendance statistics' });
  }
});

/**
 * @route GET /api/attendance/:classId/report
 * @desc Get attendance report for a date range
 * @access Private
 */
router.get('/:classId/report', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { classId } = req.params;
    const { start_date, end_date } = req.query;

    if (!classId) {
      return res.status(400).json({ error: 'Class ID is required' });
    }

    if (!start_date || !end_date || typeof start_date !== 'string' || typeof end_date !== 'string') {
      return res.status(400).json({ error: 'start_date and end_date query parameters are required' });
    }

    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    const report = await attendanceService.getClassAttendanceReport(
      classId,
      startDate,
      endDate,
      authenticatedReq.user
    );

    res.json({ report });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    logger.error('Error generating attendance report:', error);
    res.status(500).json({ error: 'Failed to generate attendance report' });
  }
});

/**
 * @route GET /api/attendance/student/:studentId/history
 * @desc Get attendance history for a specific student
 * @access Private
 */
router.get('/student/:studentId/history', authenticate, async (req: Request, res: Response) => {
  const authenticatedReq = req as AuthenticatedRequest;
  try {
    const { studentId } = req.params;
    const { class_id } = req.query;

    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' });
    }

    if (!class_id || typeof class_id !== 'string') {
      return res.status(400).json({ error: 'class_id query parameter is required' });
    }

    const history = await attendanceService.getStudentAttendanceHistory(
      studentId,
      class_id,
      authenticatedReq.user
    );

    res.json({ history: presentAttendanceRecords(history) });
  } catch (error) {
    if (error instanceof Error && error.message.includes('Access denied')) {
      return res.status(403).json({ error: error.message });
    }

    logger.error('Error fetching student attendance history:', error);
    res.status(500).json({ error: 'Failed to fetch attendance history' });
  }
});

export default router;
