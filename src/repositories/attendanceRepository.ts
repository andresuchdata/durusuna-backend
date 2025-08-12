import { Knex } from 'knex';
import {
  AttendanceRecord,
  AttendanceRecordWithStudent,
  AttendanceSession,
  SchoolAttendanceSettings,
  CreateAttendanceRecordRequest,
  AttendanceStatsResponse,
  StudentAttendanceSummary,
  LocationVerificationResult
} from '../types/attendance';
import { v4 as uuidv4 } from 'uuid';

export class AttendanceRepository {
  constructor(private db: Knex) {}

  // School attendance settings methods
  async getSchoolAttendanceSettings(schoolId: string): Promise<SchoolAttendanceSettings | null> {
    const settings = await this.db('school_attendance_settings')
      .where('school_id', schoolId)
      .first();
    
    if (settings && settings.attendance_hours) {
      settings.attendance_hours = JSON.parse(settings.attendance_hours);
    }
    
    return settings || null;
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
        updated.attendance_hours = JSON.parse(updated.attendance_hours);
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
        created.attendance_hours = JSON.parse(created.attendance_hours);
      }
      
      return created;
    }
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
    
    session.settings = JSON.parse(session.settings);
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
      session.settings = JSON.parse(session.settings);
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
    
    if (session.settings) {
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
    const [record] = await this.db('attendance_records')
      .insert({
        id: uuidv4(),
        class_id: classId,
        student_id: studentId,
        attendance_date: attendanceDate,
        status: data.status,
        check_in_time: data.check_in_time ? new Date(data.check_in_time) : null,
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
    const updateData: any = { ...data, updated_at: new Date() };
    
    if (data.check_in_time) {
      updateData.check_in_time = new Date(data.check_in_time);
    }

    const [record] = await this.db('attendance_records')
      .where('id', recordId)
      .update(updateData)
      .returning('*');
    
    return record;
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
        'users.student_id'
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
        student_id: record.student_id
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
      check_in_time: record.check_in_time ? new Date(record.check_in_time) : null,
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

  // Utility method to verify location
  verifyLocation(
    studentLat: number,
    studentLon: number,
    schoolLat: number,
    schoolLon: number,
    radiusMeters: number
  ): LocationVerificationResult {
    try {
      // Calculate distance using Haversine formula
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (studentLat * Math.PI) / 180;
      const φ2 = (schoolLat * Math.PI) / 180;
      const Δφ = ((schoolLat - studentLat) * Math.PI) / 180;
      const Δλ = ((schoolLon - studentLon) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      const distance = R * c; // Distance in meters

      return {
        is_valid: distance <= radiusMeters,
        distance_meters: Math.round(distance)
      };
    } catch (error) {
      return {
        is_valid: false,
        error: 'Failed to calculate location distance'
      };
    }
  }
}
