import { AttendanceRepository } from '../repositories/attendanceRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import {
  AttendanceRecord,
  AttendanceRecordWithStudent,
  AttendanceSession,
  SchoolAttendanceSettings,
  CreateAttendanceRecordRequest,
  BulkUpdateAttendanceRequest,
  StudentAttendanceRequest,
  AttendanceStatsResponse,
  AttendanceReportResponse,
  StudentAttendanceSummary,
  LocationVerificationResult
} from '../types/attendance';
import { AuthenticatedUser } from '../types/auth';

export class AttendanceService {
  constructor(
    private attendanceRepository: AttendanceRepository,
    private userClassRepository: UserClassRepository
  ) {}

  // School settings management
  async getSchoolAttendanceSettings(
    schoolId: string
  ): Promise<SchoolAttendanceSettings | null> {
    return await this.attendanceRepository.getSchoolAttendanceSettings(schoolId);
  }

  async updateSchoolAttendanceSettings(
    schoolId: string,
    settings: Partial<SchoolAttendanceSettings>,
    user: AuthenticatedUser
  ): Promise<SchoolAttendanceSettings> {
    // Verify user is admin of the school
    if (user.role !== 'admin' || user.school_id !== schoolId) {
      throw new Error('Access denied - admin access required');
    }

    return await this.attendanceRepository.updateSchoolAttendanceSettings(schoolId, settings);
  }

  // Teacher attendance management
  async openAttendanceSession(
    classId: string,
    sessionDate: Date,
    user: AuthenticatedUser
  ): Promise<{ session: AttendanceSession; students: any[] }> {
    // Verify teacher has access to this class
    await this.verifyTeacherClassAccess(classId, user);

    // Check if session already exists
    let session = await this.attendanceRepository.getAttendanceSession(classId, sessionDate);
    
    if (!session) {
      session = await this.attendanceRepository.createAttendanceSession(
        classId,
        user.id,
        sessionDate
      );
    }

    // Get all students in the class
    const students = await this.userClassRepository.getClassMembers(classId, 'student');

    // Get existing attendance records for this date
    const existingRecords = await this.attendanceRepository.getClassAttendanceForDate(
      classId,
      sessionDate
    );

    // Create a map of existing records by student ID
    const attendanceMap = new Map(
      existingRecords.map(record => [record.student_id, record])
    );

    // Combine students with their attendance status
    const studentsWithAttendance = students.map(student => ({
      ...student,
      attendance: attendanceMap.get(student.user_id) || null
    }));

    return {
      session,
      students: studentsWithAttendance
    };
  }

  async markStudentAttendance(
    classId: string,
    studentId: string,
    attendanceDate: Date,
    data: CreateAttendanceRecordRequest,
    user: AuthenticatedUser
  ): Promise<AttendanceRecord> {
    // Verify teacher has access to this class
    await this.verifyTeacherClassAccess(classId, user);

    // Verify student is in this class
    const studentInClass = await this.userClassRepository.getUserClass(studentId, classId);
    if (!studentInClass || studentInClass.role_in_class !== 'student') {
      throw new Error('Student not found in this class');
    }

    // Check if attendance record already exists
    const existingRecord = await this.attendanceRepository.getAttendanceRecord(
      classId,
      studentId,
      attendanceDate
    );

    if (existingRecord) {
      // Update existing record
      return await this.attendanceRepository.updateAttendanceRecord(existingRecord.id, data);
    } else {
      // Create new record
      return await this.attendanceRepository.createAttendanceRecord(
        classId,
        studentId,
        attendanceDate,
        data,
        user.id
      );
    }
  }

  async bulkUpdateAttendance(
    classId: string,
    attendanceDate: Date,
    bulkData: BulkUpdateAttendanceRequest,
    user: AuthenticatedUser
  ): Promise<AttendanceRecord[]> {
    // Verify teacher has access to this class
    await this.verifyTeacherClassAccess(classId, user);

    const results: AttendanceRecord[] = [];

    for (const record of bulkData.records) {
      const attendanceData: CreateAttendanceRecordRequest = {
        ...record,
        marked_via: bulkData.marked_via || 'manual'
      };

      const result = await this.markStudentAttendance(
        classId,
        record.student_id,
        attendanceDate,
        attendanceData,
        user
      );

      results.push(result);
    }

    return results;
  }

  async finalizeAttendance(
    classId: string,
    sessionDate: Date,
    user: AuthenticatedUser
  ): Promise<AttendanceSession> {
    // Verify teacher has access to this class
    await this.verifyTeacherClassAccess(classId, user);

    const session = await this.attendanceRepository.getAttendanceSession(classId, sessionDate);
    if (!session) {
      throw new Error('Attendance session not found');
    }

    if (session.is_finalized) {
      throw new Error('Attendance session is already finalized');
    }

    return await this.attendanceRepository.finalizeAttendanceSession(session.id);
  }

  // Student GPS attendance
  async markStudentAttendanceGPS(
    request: StudentAttendanceRequest,
    user: AuthenticatedUser
  ): Promise<AttendanceRecord> {
    // Verify student is enrolled in this class
    const userClass = await this.userClassRepository.getUserClass(user.id, request.class_id);
    if (!userClass || userClass.role_in_class !== 'student') {
      throw new Error('Access denied - not enrolled in this class');
    }

    // Get school attendance settings
    const settings = await this.attendanceRepository.getSchoolAttendanceSettings(user.school_id);
    
    // Check if location is required
    if (settings?.require_location && (!request.latitude || !request.longitude)) {
      throw new Error('GPS location is required for attendance');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of day

    // Check if attendance already marked for today
    const existingRecord = await this.attendanceRepository.getAttendanceRecord(
      request.class_id,
      user.id,
      today
    );

    if (existingRecord) {
      throw new Error('Attendance already marked for today');
    }

    // Verify location if required
    let locationVerified = false;
    if (settings?.require_location && request.latitude && request.longitude && 
        settings.school_latitude && settings.school_longitude) {
      
      const verification = this.attendanceRepository.verifyLocation(
        request.latitude,
        request.longitude,
        settings.school_latitude,
        settings.school_longitude,
        settings.location_radius_meters
      );

      if (!verification.is_valid) {
        throw new Error(`Location verification failed. You must be within ${settings.location_radius_meters}m of the school.`);
      }

      locationVerified = true;
    }

    // Determine attendance status based on time
    const now = new Date();
    let status: 'present' | 'late' = 'present';

    if (settings?.attendance_hours?.start && settings.late_threshold_minutes) {
      const [startHour, startMinute] = settings.attendance_hours.start.split(':').map(Number);
      const schoolStartTime = new Date(today);
      schoolStartTime.setHours(startHour, startMinute, 0, 0);
      
      const lateThreshold = new Date(schoolStartTime.getTime() + settings.late_threshold_minutes * 60000);
      
      if (now > lateThreshold) {
        status = 'late';
      }
    }

    // Create attendance record
    const attendanceData: CreateAttendanceRecordRequest = {
      student_id: user.id,
      status,
      check_in_time: now.toISOString(),
      marked_via: 'gps',
      student_latitude: request.latitude,
      student_longitude: request.longitude
    };

    const record = await this.attendanceRepository.createAttendanceRecord(
      request.class_id,
      user.id,
      today,
      attendanceData
    );

    // Update location verification status
    if (settings?.require_location) {
      await this.attendanceRepository.updateLocationVerification(record.id, locationVerified);
    }

    return record;
  }

  // Reporting and statistics
  async getClassAttendanceReport(
    classId: string,
    startDate: Date,
    endDate: Date,
    user: AuthenticatedUser
  ): Promise<AttendanceReportResponse> {
    // Verify access to class
    await this.verifyClassAccess(classId, user);

    // Get class info
    const classInfo = await this.userClassRepository.getClassById(classId);
    if (!classInfo) {
      throw new Error('Class not found');
    }

    // Get all students in class
    const students = await this.userClassRepository.getClassMembers(classId, 'student');

    // Generate student summaries
    const studentSummaries: StudentAttendanceSummary[] = [];
    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalExcused = 0;
    let totalRecords = 0;

    for (const student of students) {
      const summary = await this.attendanceRepository.getStudentAttendanceSummary(
        student.user_id,
        classId,
        startDate,
        endDate
      );

      studentSummaries.push(summary);
      
      totalPresent += summary.present_days;
      totalAbsent += summary.absent_days;
      totalLate += summary.late_days;
      totalExcused += summary.excused_days;
      totalRecords += summary.total_days;
    }

    const overallAttendanceRate = totalRecords > 0 
      ? Math.round(((totalPresent + totalLate + totalExcused) / totalRecords) * 10000) / 100
      : 0;

    return {
      class_id: classId,
      class_name: classInfo.name,
      date_range: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      },
      summary: {
        total_students: students.length,
        present: totalPresent,
        absent: totalAbsent,
        late: totalLate,
        excused: totalExcused,
        attendance_rate: overallAttendanceRate
      },
      students: studentSummaries
    };
  }

  async getAttendanceStats(
    classId: string,
    attendanceDate: Date,
    user: AuthenticatedUser
  ): Promise<AttendanceStatsResponse> {
    await this.verifyClassAccess(classId, user);
    return await this.attendanceRepository.getAttendanceStats(classId, attendanceDate);
  }

  async getStudentAttendanceHistory(
    studentId: string,
    classId: string,
    user: AuthenticatedUser
  ): Promise<AttendanceRecord[]> {
    // Verify access - either the student themselves, their teacher, or admin
    if (user.id !== studentId) {
      await this.verifyClassAccess(classId, user);
    }

    return await this.attendanceRepository.getStudentAttendanceRecords(studentId, classId);
  }

  // Helper methods
  private async verifyTeacherClassAccess(classId: string, user: AuthenticatedUser): Promise<void> {
    if (user.user_type !== 'teacher') {
      throw new Error('Access denied - teacher access required');
    }

    // Admin teachers can access any class in their school
    if (user.role === 'admin') {
      const classInfo = await this.userClassRepository.getClassById(classId);
      if (!classInfo || classInfo.school_id !== user.school_id) {
        throw new Error('Class not found or access denied');
      }
      return;
    }

    // Regular teachers need to be assigned to the class
    const userClass = await this.userClassRepository.getUserClass(user.id, classId);
    if (!userClass || userClass.role_in_class !== 'teacher') {
      throw new Error('Access denied - not assigned to this class');
    }
  }

  private async verifyClassAccess(classId: string, user: AuthenticatedUser): Promise<void> {
    // Admin can access any class in their school
    if (user.role === 'admin') {
      const classInfo = await this.userClassRepository.getClassById(classId);
      if (!classInfo || classInfo.school_id !== user.school_id) {
        throw new Error('Class not found or access denied');
      }
      return;
    }

    // Teachers and students need to be members of the class
    const userClass = await this.userClassRepository.getUserClass(user.id, classId);
    if (!userClass) {
      throw new Error('Access denied - not a member of this class');
    }
  }
}
