import { AttendanceRecord, AttendanceRecordWithStudent, AttendanceSession } from '../types/attendance';

function pad2(n: number): string { return n.toString().padStart(2, '0'); }

export function formatDateOnly(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function formatDateTimeLocal(input: Date | string): string {
  const d = typeof input === 'string' ? new Date(input) : input;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function combineDateAndTimeLocal(dateOnly: Date | string, time: string): string {
  const base = typeof dateOnly === 'string' ? new Date(dateOnly) : dateOnly;
  const parts = (time || '').split(':');
  const hhStr = parts[0] ?? '00';
  const mmStr = parts[1] ?? '00';
  const ssStr = parts[2] ?? '00';
  const hours = Number.parseInt(hhStr, 10);
  const minutes = Number.parseInt(mmStr, 10);
  const seconds = Number.parseInt(ssStr, 10);
  const dt = new Date(
    base.getFullYear(),
    base.getMonth(),
    base.getDate(),
    Number.isFinite(hours) ? hours : 0,
    Number.isFinite(minutes) ? minutes : 0,
    Number.isFinite(seconds) ? seconds : 0,
    0
  );
  return formatDateTimeLocal(dt);
}

export function presentAttendanceRecord(record: any): any {
  if (!record) return record;
  const attendanceDate = record.attendance_date;
  const timeVal = record.check_in_time as string | Date | null | undefined;

  let checkInOut: string | null = null;
  if (timeVal) {
    if (typeof timeVal === 'string') {
      // HH:MM or HH:MM:SS
      if (/^\d{2}:\d{2}(:\d{2})?$/.test(timeVal)) {
        checkInOut = combineDateAndTimeLocal(attendanceDate, timeVal.length === 5 ? `${timeVal}:00` : timeVal);
      } else {
        // Try parse as date-time string
        checkInOut = formatDateTimeLocal(timeVal);
      }
    } else {
      checkInOut = formatDateTimeLocal(timeVal);
    }
  }

  return {
    ...record,
    attendance_date: attendanceDate ? formatDateOnly(attendanceDate) : attendanceDate,
    check_in_time: checkInOut,
    student_latitude: record.student_latitude ? Number(record.student_latitude) : record.student_latitude,
    student_longitude: record.student_longitude ? Number(record.student_longitude) : record.student_longitude,
    created_at: record.created_at ? formatDateTimeLocal(record.created_at) : record.created_at,
    updated_at: record.updated_at ? formatDateTimeLocal(record.updated_at) : record.updated_at,
  };
}

export function presentAttendanceRecords(records: any[]): any[] {
  return records.map(presentAttendanceRecord);
}

export function presentAttendanceSession(session: any): any {
  if (!session) return session;
  return {
    ...session,
    session_date: session.session_date ? formatDateOnly(session.session_date) : session.session_date,
    opened_at: session.opened_at ? formatDateTimeLocal(session.opened_at) : session.opened_at,
    closed_at: session.closed_at ? formatDateTimeLocal(session.closed_at) : session.closed_at,
    created_at: session.created_at ? formatDateTimeLocal(session.created_at) : session.created_at,
    updated_at: session.updated_at ? formatDateTimeLocal(session.updated_at) : session.updated_at,
  } as AttendanceSession;
}

export function presentStudentsWithAttendance(students: any[]): any[] {
  return students.map((s) => ({
    ...s,
    attendance: s.attendance ? presentAttendanceRecord(s.attendance) : null,
  }));
}


