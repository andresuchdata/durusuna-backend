import { AttendanceRepository } from '../repositories/attendanceRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import {
  AttendanceRecord,
  AttendanceSession,
  SchoolAttendanceSettings,
  CreateAttendanceRecordRequest,
  BulkUpdateAttendanceRequest,
  StudentAttendanceRequest,
  AttendanceStatsResponse,
  AttendanceReportResponse,
  StudentAttendanceSummary,
  TeacherAttendanceOverview,
  TeacherAttendanceRequest,
  TeacherAttendanceRecord,
  SchoolTeachersAttendanceReport,
} from '../types/attendance';
import { AuthenticatedRequest } from '../types/auth';

type AuthenticatedUser = AuthenticatedRequest['user'];

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

  async getStudentAttendanceStatusForToday(
    classId: string,
    studentId: string,
    date: Date
  ): Promise<any | null> {
    return await this.attendanceRepository.getStudentAttendanceForDate(classId, studentId, date);
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
    const studentsWithAttendance = students.map((student: any) => ({
      ...student,
      attendance: attendanceMap.get(student.user_id) || null
    }));

    // Debug log to verify mapping
    console.log('🔍 Attendance Debug:');
    console.log(`  Found ${existingRecords.length} attendance records`);
    console.log(`  Found ${students.length} students`);
    existingRecords.forEach(record => {
      console.log(`  📋 Record: student_id=${record.student_id}, status=${record.status}`);
    });
    students.forEach(student => {
      const hasAttendance = attendanceMap.has(student.user_id);
      console.log(`  👤 Student: user_id=${student.user_id}, hasAttendance=${hasAttendance}`);
      if (hasAttendance) {
        const attendanceRecord = attendanceMap.get(student.user_id);
        console.log(`     ✅ Matched with attendance: ${attendanceRecord?.status}`);
      }
    });

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

  async deleteStudentAttendance(
    classId: string,
    studentId: string,
    attendanceDate: Date,
    user: AuthenticatedUser
  ): Promise<void> {
    // Verify teacher has access to this class
    await this.verifyTeacherClassAccess(classId, user);

    // Verify student is in this class
    const studentInClass = await this.userClassRepository.getUserClass(studentId, classId);
    if (!studentInClass || studentInClass.role_in_class !== 'student') {
      throw new Error('Student not found in this class');
    }

    // Check if attendance record exists
    const existingRecord = await this.attendanceRepository.getAttendanceRecord(
      classId,
      studentId,
      attendanceDate
    );

    if (!existingRecord) {
      throw new Error('Attendance record not found');
    }

    // Delete the attendance record
    await this.attendanceRepository.deleteAttendanceRecord(existingRecord.id);
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
      const timeParts = settings.attendance_hours.start.split(':').map(Number);
      const startHour = timeParts[0] || 0;
      const startMinute = timeParts[1] || 0;
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
        start_date: startDate.toISOString().split('T')[0] || '',
        end_date: endDate.toISOString().split('T')[0] || ''
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

  // Teacher attendance management methods
  async getTeacherClasses(teacherId: string): Promise<any[]> {
    // Get all classes where the teacher is assigned
    const classes = await this.userClassRepository.getUserClasses(teacherId, 'teacher');
    
    // For each class, get basic attendance info
    const classesWithAttendance = await Promise.all(
      classes.map(async (classInfo: any) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const session = await this.attendanceRepository.getAttendanceSession(
          classInfo.class_id,
          today
        );
        
        const studentCount = await this.userClassRepository.getClassMemberCount(
          classInfo.class_id,
          'student'
        );

        return {
          ...classInfo,
          has_attendance_session: !!session,
          is_finalized: session?.is_finalized || false,
          student_count: studentCount
        };
      })
    );

    return classesWithAttendance;
  }

  async getTeacherAttendanceOverview(
    teacherId: string,
    date: Date
  ): Promise<TeacherAttendanceOverview> {
    const classes = await this.getTeacherClasses(teacherId);
    
    let classesWithAttendance = 0;
    let classesWithoutAttendance = 0;
    const classesDetail = [];

    for (const classInfo of classes) {
      const session = await this.attendanceRepository.getAttendanceSession(
        classInfo.class_id,
        date
      );

      const hasAttendanceSession = !!session;
      if (hasAttendanceSession) {
        classesWithAttendance++;
      } else {
        classesWithoutAttendance++;
      }

      // Get attendance stats if session exists
      let stats = {
        present_count: 0,
        absent_count: 0,
        late_count: 0,
        excused_count: 0
      };

      if (session) {
        const attendanceRecords = await this.attendanceRepository.getClassAttendanceForDate(
          classInfo.class_id,
          date
        );

        stats = attendanceRecords.reduce((acc, record) => {
          acc[`${record.status}_count`]++;
          return acc;
        }, { present_count: 0, absent_count: 0, late_count: 0, excused_count: 0 });
      }

      classesDetail.push({
        class_id: classInfo.class_id,
        class_name: classInfo.class_name,
        has_attendance_session: hasAttendanceSession,
        is_finalized: session?.is_finalized || false,
        student_count: classInfo.student_count,
        ...stats
      });
    }

    // Get teacher info
    const teacher = await this.userClassRepository.getUserById(teacherId);

    return {
      teacher_id: teacherId,
      teacher_name: `${teacher.first_name} ${teacher.last_name}`,
      total_classes: classes.length,
      classes_with_attendance: classesWithAttendance,
      classes_without_attendance: classesWithoutAttendance,
      classes: classesDetail
    };
  }

  async submitTeacherAttendance(
    teacherId: string,
    date: Date,
    data: TeacherAttendanceRequest
  ): Promise<TeacherAttendanceRecord> {
    // Check if teacher already submitted attendance for this date
    const existingRecord = await this.attendanceRepository.getTeacherAttendanceForDate(
      teacherId,
      date
    );

    if (existingRecord) {
      throw new Error('Attendance already submitted for this date');
    }

    // Create teacher attendance record
    const record = await this.attendanceRepository.createTeacherAttendanceRecord(
      teacherId,
      date,
      data
    );

    // Get teacher info for the response
    const teacher = await this.userClassRepository.getUserById(teacherId);
    
    return {
      ...record,
      teacher: {
        id: teacher.id,
        first_name: teacher.first_name,
        last_name: teacher.last_name,
        email: teacher.email,
        avatar_url: teacher.avatar_url
      }
    };
  }

  async getSchoolTeachersAttendance(
    schoolId: string,
    date: Date
  ): Promise<any[]> {
    // Get all teachers in the school
    const teachers = await this.userClassRepository.getSchoolTeachers(schoolId);
    
    const teachersAttendance = await Promise.all(
      teachers.map(async (teacher: any) => {
        const attendanceRecord = await this.attendanceRepository.getTeacherAttendanceForDate(
          teacher.id,
          date
        );

        return {
          teacher: {
            id: teacher.id,
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            email: teacher.email,
            avatar_url: teacher.avatar_url
          },
          attendance: attendanceRecord || null
        };
      })
    );

    return teachersAttendance;
  }

  async getSchoolTeachersAttendanceReport(
    schoolId: string,
    startDate: Date,
    endDate: Date
  ): Promise<SchoolTeachersAttendanceReport> {
    // Get all teachers in the school
    const teachers = await this.userClassRepository.getSchoolTeachers(schoolId);
    
    const teachersReport = await Promise.all(
      teachers.map(async (teacher: any) => {
        const attendanceRecords = await this.attendanceRepository.getTeacherAttendanceRecords(
          teacher.id,
          startDate,
          endDate
        );

        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const presentDays = attendanceRecords.filter(r => r.status === 'present').length;
        const absentDays = attendanceRecords.filter(r => r.status === 'absent').length;
        const lateDays = attendanceRecords.filter(r => r.status === 'late').length;
        const excusedDays = attendanceRecords.filter(r => r.status === 'excused').length;
        
        const attendanceRate = totalDays > 0 
          ? Math.round(((presentDays + lateDays + excusedDays) / totalDays) * 10000) / 100
          : 0;

        return {
          teacher_id: teacher.id,
          teacher_name: `${teacher.first_name} ${teacher.last_name}`,
          total_days: totalDays,
          present_days: presentDays,
          absent_days: absentDays,
          late_days: lateDays,
          excused_days: excusedDays,
          attendance_rate: attendanceRate,
          attendance_records: attendanceRecords.map(record => ({
            ...record,
            teacher: {
              id: teacher.id,
              first_name: teacher.first_name,
              last_name: teacher.last_name,
              email: teacher.email,
              avatar_url: teacher.avatar_url
            }
          }))
        };
      })
    );

    // Calculate summary
    const totalTeachers = teachersReport.length;
    const totalPresentDays = teachersReport.reduce((sum, t) => sum + t.present_days, 0);
    const totalAbsentDays = teachersReport.reduce((sum, t) => sum + t.absent_days, 0);
    const totalLateDays = teachersReport.reduce((sum, t) => sum + t.late_days, 0);
    const totalExcusedDays = teachersReport.reduce((sum, t) => sum + t.excused_days, 0);
    const totalDays = teachersReport.reduce((sum, t) => sum + t.total_days, 0);
    
    const averageAttendanceRate = totalDays > 0 
      ? Math.round(((totalPresentDays + totalLateDays + totalExcusedDays) / totalDays) * 10000) / 100
      : 0;

    // Get school info
    const school = await this.userClassRepository.getSchoolById(schoolId);

    return {
      school_id: schoolId,
      school_name: school.name,
      date_range: {
        start_date: startDate.toISOString().split('T')[0] || '',
        end_date: endDate.toISOString().split('T')[0] || ''
      },
      summary: {
        total_teachers: totalTeachers,
        present_days: totalPresentDays,
        absent_days: totalAbsentDays,
        late_days: totalLateDays,
        excused_days: totalExcusedDays,
        average_attendance_rate: averageAttendanceRate
      },
      teachers: teachersReport
    };
  }

  async getTeacherAttendanceForDate(
    teacherId: string,
    date: Date
  ): Promise<AttendanceRecord | null> {
    return await this.attendanceRepository.getTeacherAttendanceForDate(teacherId, date);
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

    // Regular teachers must be homeroom teachers for the class to mark attendance
    const isHomeroomTeacher = await this.userClassRepository.isHomeroomTeacher(user.id, classId);
    if (!isHomeroomTeacher) {
      throw new Error('Access denied - only homeroom teachers can mark attendance for this class');
    }

    // Also verify they are assigned to the class
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
