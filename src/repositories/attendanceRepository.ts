import { Knex } from 'knex';
import {
  AttendanceRecord,
  AttendanceRecordWithStudent,
  AttendanceSession,
  SchoolAttendanceSettings,
  CreateAttendanceRecordRequest,
  AttendanceStatsResponse,
  StudentAttendanceSummary
} from '../types/attendance';
import { verifyLocationWithinRadius, LocationVerificationResult } from '../utils/locationUtils';
import { v4 as uuidv4 } from 'uuid';

export class AttendanceRepository {
  constructor(private db: Knex) {}

  // School attendance settings methods
  async getSchoolAttendanceSettings(schoolId: string): Promise<SchoolAttendanceSettings | null> {
    const settings = await this.db('school_attendance_settings')
      .where('school_id', schoolId)
      .first();
    
    if (settings) {
      // Ensure attendance_hours is properly parsed from JSON
      if (settings.attendance_hours) {
        if (typeof settings.attendance_hours === 'string') {
          try {
            settings.attendance_hours = JSON.parse(settings.attendance_hours);
          } catch (e) {
            // If parsing fails, set default
            settings.attendance_hours = { start: '08:00', end: '15:00' };
          }
        }
      } else {
        // If attendance_hours is null/undefined, set default
        settings.attendance_hours = { start: '08:00', end: '15:00' };
      }
      
      // Convert numeric strings to proper numbers (PostgreSQL decimal/integer fields)
      if (settings.school_latitude && typeof settings.school_latitude === 'string') {
        settings.school_latitude = parseFloat(settings.school_latitude);
      }
      if (settings.school_longitude && typeof settings.school_longitude === 'string') {
        settings.school_longitude = parseFloat(settings.school_longitude);
      }
      if (settings.location_radius_meters && typeof settings.location_radius_meters === 'string') {
        settings.location_radius_meters = parseInt(settings.location_radius_meters, 10);
      }
      if (settings.late_threshold_minutes && typeof settings.late_threshold_minutes === 'string') {
        settings.late_threshold_minutes = parseInt(settings.late_threshold_minutes, 10);
      }
      
      return settings;
    }
    
    return null;
  }

  async updateSchoolAttendanceSettings(
    schoolId: string, 
    settings: Partial<SchoolAttendanceSettings>
  ): Promise<SchoolAttendanceSettings> {
    const settingsToUpdate: any = { ...settings };
    if (settingsToUpdate.attendance_hours) {
      settingsToUpdate.attendance_hours = JSON.stringify(settingsToUpdate.attendance_hours);
    }

    const existing = await this.getSchoolAttendanceSettings(schoolId);
    
    if (existing) {
      const [updated] = await this.db('school_attendance_settings')
        .where('school_id', schoolId)
        .update({
          ...settingsToUpdate,
          updated_at: new Date()
        })
        .returning('*');
      
      if (updated.attendance_hours) {
        // Only parse if it's a string (from database), not if it's already an object (from request)
        if (typeof updated.attendance_hours === 'string') {
          updated.attendance_hours = JSON.parse(updated.attendance_hours);
        }
      }
      
      // Convert numeric strings to proper numbers
      if (updated.school_latitude && typeof updated.school_latitude === 'string') {
        updated.school_latitude = parseFloat(updated.school_latitude);
      }
      if (updated.school_longitude && typeof updated.school_longitude === 'string') {
        updated.school_longitude = parseFloat(updated.school_longitude);
      }
      if (updated.location_radius_meters && typeof updated.location_radius_meters === 'string') {
        updated.location_radius_meters = parseInt(updated.location_radius_meters, 10);
      }
      if (updated.late_threshold_minutes && typeof updated.late_threshold_minutes === 'string') {
        updated.late_threshold_minutes = parseInt(updated.late_threshold_minutes, 10);
      }
      
      return updated;
    } else {
      const [created] = await this.db('school_attendance_settings')
        .insert({
          id: uuidv4(),
          school_id: schoolId,
          ...settingsToUpdate,
          created_at: new Date(),
          updated_at: new Date()
        })
        .returning('*');
      
      if (created.attendance_hours) {
        // Only parse if it's a string (from database), not if it's already an object (from request)
        if (typeof created.attendance_hours === 'string') {
          created.attendance_hours = JSON.parse(created.attendance_hours);
        }
      }
      
      // Convert numeric strings to proper numbers
      if (created.school_latitude && typeof created.school_latitude === 'string') {
        created.school_latitude = parseFloat(created.school_latitude);
      }
      if (created.school_longitude && typeof created.school_longitude === 'string') {
        created.school_longitude = parseFloat(created.school_longitude);
      }
      if (created.location_radius_meters && typeof created.location_radius_meters === 'string') {
        created.location_radius_meters = parseInt(created.location_radius_meters, 10);
      }
      if (created.late_threshold_minutes && typeof created.late_threshold_minutes === 'string') {
        created.late_threshold_minutes = parseInt(created.late_threshold_minutes, 10);
      }
      
      return created;
    }
  }

  async getStudentAttendanceForDate(
    classId: string,
    studentId: string,
    date: Date
  ): Promise<any | null> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const attendance = await this.db('attendance_records')
      .where('class_id', classId)
      .where('student_id', studentId)
      .whereBetween('created_at', [startOfDay, endOfDay])
      .first();

    return attendance || null;
  }

  // Attendance session methods
  async createAttendanceSession(
    classId: string, 
    teacherId: string, 
    sessionDate: Date
  ): Promise<AttendanceSession> {
    const [session] = await this.db('attendance_sessions')
      .insert({
        id: uuidv4(),
        class_id: classId,
        teacher_id: teacherId,
        session_date: sessionDate,
        opened_at: new Date(),
        is_finalized: false,
        settings: JSON.stringify({}),
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    if (session.settings && typeof session.settings === 'string') {
      session.settings = JSON.parse(session.settings);
    }
    return session;
  }

  async getAttendanceSession(
    classId: string, 
    sessionDate: Date
  ): Promise<AttendanceSession | null> {
    const session = await this.db('attendance_sessions')
      .where({
        class_id: classId,
        session_date: sessionDate
      })
      .first();
    
    if (session && session.settings) {
      if (typeof session.settings === 'string') {
        session.settings = JSON.parse(session.settings);
      }
    }
    
    return session || null;
  }

  async finalizeAttendanceSession(sessionId: string): Promise<AttendanceSession> {
    const [session] = await this.db('attendance_sessions')
      .where('id', sessionId)
      .update({
        is_finalized: true,
        closed_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    if (session.settings && typeof session.settings === 'string') {
      session.settings = JSON.parse(session.settings);
    }
    
    return session;
  }

  // Attendance record methods
  async createAttendanceRecord(
    classId: string,
    studentId: string,
    attendanceDate: Date,
    data: CreateAttendanceRecordRequest,
    markedBy?: string
  ): Promise<AttendanceRecord> {
    const checkInTimeValue = data.check_in_time
      ? (typeof data.check_in_time === 'string'
          ? this.normalizeCheckInTimeString(data.check_in_time)
          : new Date(data.check_in_time).toISOString().substring(11, 19))
      : null;

    const [record] = await this.db('attendance_records')
      .insert({
        id: uuidv4(),
        class_id: classId,
        student_id: studentId,
        attendance_date: attendanceDate,
        status: data.status,
        check_in_time: checkInTimeValue,
        notes: data.notes,
        marked_by: markedBy,
        marked_via: data.marked_via || 'manual',
        student_latitude: data.student_latitude,
        student_longitude: data.student_longitude,
        location_verified: false, // Will be updated after verification
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    return record;
  }

  async updateAttendanceRecord(
    recordId: string,
    data: Partial<CreateAttendanceRecordRequest>
  ): Promise<AttendanceRecord> {
    const checkInTimeValue = data.check_in_time
      ? (typeof data.check_in_time === 'string'
          ? this.normalizeCheckInTimeString(data.check_in_time)
          : new Date(data.check_in_time).toISOString().substring(11, 19))
      : null;

    const [updated] = await this.db('attendance_records')
      .where('id', recordId)
      .update({
        ...data,
        check_in_time: checkInTimeValue,
        updated_at: new Date()
      })
      .returning('*');

    return updated;
  }

  /**
   * Normalizes ISO or partial time strings to HH:MM:SS for insertion into a Postgres TIME column.
   */
  private normalizeCheckInTimeString(value: string): string {
    try {
      // If contains date separator, parse as Date
      if (value.includes('T') || value.includes(' ')) {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toISOString().substring(11, 19); // HH:MM:SS
        }
      }
      // If already HH:MM:SS
      if (/^\d{2}:\d{2}:\d{2}$/.test(value)) {
        return value;
      }
      // If HH:MM, add seconds
      if (/^\d{2}:\d{2}$/.test(value)) {
        return `${value}:00`;
      }
      // Fallback: try Date parse
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        return date.toISOString().substring(11, 19);
      }
    } catch (_) {}
    // As a last resort, return current time HH:MM:SS to avoid DB errors
    const now = new Date();
    return now.toISOString().substring(11, 19);
  }

  async getAttendanceRecord(
    classId: string,
    studentId: string,
    attendanceDate: Date
  ): Promise<AttendanceRecord | null> {
    return await this.db('attendance_records')
      .where({
        class_id: classId,
        student_id: studentId,
        attendance_date: attendanceDate
      })
      .first();
  }

  async deleteAttendanceRecord(recordId: string): Promise<void> {
    await this.db('attendance_records')
      .where('id', recordId)
      .delete();
  }

  async getClassAttendanceForDate(
    classId: string,
    attendanceDate: Date
  ): Promise<AttendanceRecordWithStudent[]> {
    const records = await this.db('attendance_records')
      .join('users', 'attendance_records.student_id', 'users.id')
      .where({
        'attendance_records.class_id': classId,
        'attendance_records.attendance_date': attendanceDate
      })
      .select(
        'attendance_records.*',
        'users.id as student_user_id',
        'users.first_name as student_first_name',
        'users.last_name as student_last_name',
        'users.email as student_email',
        'users.avatar_url as student_avatar_url',
        'users.student_id as student_roll_number'
      )
      .orderBy('users.first_name', 'asc');

    return records.map(record => ({
      ...record,
      student: {
        id: record.student_user_id,
        first_name: record.student_first_name,
        last_name: record.student_last_name,
        email: record.student_email,
        avatar_url: record.student_avatar_url,
        student_id: record.student_roll_number
      }
    }));
  }

  async getStudentAttendanceRecords(
    studentId: string,
    classId?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AttendanceRecord[]> {
    let query = this.db('attendance_records')
      .where('student_id', studentId);

    if (classId) {
      query = query.where('class_id', classId);
    }

    if (startDate) {
      query = query.where('attendance_date', '>=', startDate);
    }

    if (endDate) {
      query = query.where('attendance_date', '<=', endDate);
    }

    return await query.orderBy('attendance_date', 'desc');
  }

  async getAttendanceStats(
    classId: string,
    attendanceDate: Date
  ): Promise<AttendanceStatsResponse> {
    // Get total students in class
    const totalStudentsResult = await this.db('user_classes')
      .where({
        class_id: classId,
        role_in_class: 'student',
        is_active: true
      })
      .count('* as count')
      .first();

    const totalStudents = parseInt(totalStudentsResult?.count as string) || 0;

    // Get attendance counts
    const attendanceCounts = await this.db('attendance_records')
      .where({
        class_id: classId,
        attendance_date: attendanceDate
      })
      .select('status')
      .count('* as count')
      .groupBy('status');

    const counts = {
      present: 0,
      absent: 0,
      late: 0,
      excused: 0
    };

    attendanceCounts.forEach(item => {
      counts[item.status as keyof typeof counts] = parseInt(item.count as string);
    });

    // Calculate attendance rate
    const totalMarked = counts.present + counts.absent + counts.late + counts.excused;
    const presentCount = counts.present + counts.late + counts.excused; // All except absent
    const attendanceRate = totalMarked > 0 ? (presentCount / totalMarked) * 100 : 0;

    return {
      total_students: totalStudents,
      present: counts.present,
      absent: counts.absent,
      late: counts.late,
      excused: counts.excused,
      attendance_rate: Math.round(attendanceRate * 100) / 100 // Round to 2 decimal places
    };
  }

  async getStudentAttendanceSummary(
    studentId: string,
    classId: string,
    startDate: Date,
    endDate: Date
  ): Promise<StudentAttendanceSummary> {
    // Get student info
    const student = await this.db('users')
      .where('id', studentId)
      .select('first_name', 'last_name')
      .first();

    // Get attendance records
    const records = await this.getStudentAttendanceRecords(studentId, classId, startDate, endDate);

    const summary = {
      student_id: studentId,
      student_name: `${student?.first_name || ''} ${student?.last_name || ''}`.trim(),
      total_days: records.length,
      present_days: records.filter(r => r.status === 'present').length,
      absent_days: records.filter(r => r.status === 'absent').length,
      late_days: records.filter(r => r.status === 'late').length,
      excused_days: records.filter(r => r.status === 'excused').length,
      attendance_rate: 0
    };

    // Calculate attendance rate (present + late + excused = "attended")
    const attendedDays = summary.present_days + summary.late_days + summary.excused_days;
    summary.attendance_rate = summary.total_days > 0 
      ? Math.round((attendedDays / summary.total_days) * 10000) / 100 
      : 0;

    return summary;
  }

  async bulkCreateAttendanceRecords(
    classId: string,
    attendanceDate: Date,
    records: CreateAttendanceRecordRequest[],
    markedBy?: string
  ): Promise<AttendanceRecord[]> {
    const recordsToInsert = records.map(record => ({
      id: uuidv4(),
      class_id: classId,
      student_id: record.student_id,
      attendance_date: attendanceDate,
      status: record.status,
      check_in_time: record.check_in_time ? (typeof record.check_in_time === 'string' ? record.check_in_time : new Date(record.check_in_time).toISOString().substring(11, 19)) : null,
      notes: record.notes,
      marked_by: markedBy,
      marked_via: record.marked_via || 'manual',
      student_latitude: record.student_latitude,
      student_longitude: record.student_longitude,
      location_verified: false,
      created_at: new Date(),
      updated_at: new Date()
    }));

    return await this.db('attendance_records')
      .insert(recordsToInsert)
      .returning('*');
  }

  async updateLocationVerification(
    recordId: string,
    isVerified: boolean
  ): Promise<void> {
    await this.db('attendance_records')
      .where('id', recordId)
      .update({
        location_verified: isVerified,
        updated_at: new Date()
      });
  }

  // Teacher attendance methods
  async getTeacherAttendanceForDate(
    teacherId: string,
    date: Date
  ): Promise<AttendanceRecord | null> {
    const record = await this.db('teacher_attendance_records')
      .where({
        teacher_id: teacherId,
        attendance_date: date
      })
      .first();
    
    return record || null;
  }

  async createTeacherAttendanceRecord(
    teacherId: string,
    date: Date,
    data: { 
      status: string; 
      notes?: string;
      marked_via?: string;
      location_verified?: boolean;
    }
  ): Promise<AttendanceRecord> {
    const [record] = await this.db('teacher_attendance_records')
      .insert({
        id: uuidv4(),
        teacher_id: teacherId,
        attendance_date: date,
        status: data.status,
        notes: data.notes,
        marked_via: data.marked_via || 'manual',
        location_verified: data.location_verified || false,
        created_at: new Date(),
        updated_at: new Date()
      })
      .returning('*');
    
    return record;
  }

  async getTeacherAttendanceRecords(
    teacherId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AttendanceRecord[]> {
    return await this.db('teacher_attendance_records')
      .where('teacher_id', teacherId)
      .whereBetween('attendance_date', [startDate, endDate])
      .orderBy('attendance_date', 'desc');
  }

  async updateTeacherAttendanceRecord(
    recordId: string,
    data: Partial<AttendanceRecord>
  ): Promise<AttendanceRecord> {
    const [updated] = await this.db('teacher_attendance_records')
      .where('id', recordId)
      .update({
        ...data,
        updated_at: new Date()
      })
      .returning('*');
    
    return updated;
  }

  async deleteTeacherAttendanceRecord(recordId: string): Promise<void> {
    await this.db('teacher_attendance_records')
      .where('id', recordId)
      .del();
  }

  // Utility method to verify location
  verifyLocation(
    studentLat: number,
    studentLon: number,
    schoolLat: number,
    schoolLon: number,
    radiusMeters: number
  ): LocationVerificationResult {
    return verifyLocationWithinRadius(
      { latitude: studentLat, longitude: studentLon },
      { latitude: schoolLat, longitude: schoolLon },
      radiusMeters
    );
  }
}
