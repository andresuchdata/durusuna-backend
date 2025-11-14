import { Knex } from 'knex';
import {
  AdminLessonSummary,
  LessonInstance,
  LessonInstanceQueryParams,
  CreateLessonInstanceRequest,
  UpdateLessonInstanceRequest,
  ScheduleTemplate,
  ScheduleTemplateSlot,
  TeacherLessonSummary,
  LessonInstanceStatus,
} from '../types/lesson';

type CreateLessonInstanceDBPayload = CreateLessonInstanceRequest & {
  created_by?: string | null;
};

type UpdateLessonInstanceDBPayload = UpdateLessonInstanceRequest & {
  updated_by?: string | null;
};

export class LessonRepository {
  constructor(private db: Knex) {}

  async findLessonInstancesByClassId(
    classId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<LessonInstance[]> {
    const query = this.baseLessonInstanceQuery(params)
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id')
      .where('cs.class_id', classId);

    return await query.select('li.*');
  }

  private mapAdminLessonRow(row: Record<string, unknown>): AdminLessonSummary {
    const scheduledStart = this.ensureDateString(row.scheduled_start);
    const scheduledEnd = this.ensureDateString(row.scheduled_end);

    return {
      id: String(row.id),
      title: (row.title as string | null) ?? null,
      subject_name: (row.subject_name as string | null) ?? null,
      class_name: (row.class_name as string | null) ?? null,
      teacher_name: this.buildTeacherName(
        row.teacher_first_name as string | null,
        row.teacher_last_name as string | null,
      ),
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      status: row.status as LessonInstanceStatus,
    };
  }

  private buildTeacherName(firstName?: string | null, lastName?: string | null): string | null {
    const parts = [firstName, lastName]
      .map((part) => (typeof part === 'string' ? part.trim() : ''))
      .filter((part) => part.length > 0);

    if (parts.length === 0) {
      return null;
    }

    return parts.join(' ');
  }

  async findAdminLessonsForSchool(
    schoolId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<AdminLessonSummary[]> {
    const query = this.baseLessonInstanceQuery(params)
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id')
      .join('classes as c', 'cs.class_id', 'c.id')
      .leftJoin('subjects as s', 'cs.subject_id', 's.id')
      .leftJoin('users as u', 'cs.teacher_id', 'u.id')
      .where('c.school_id', schoolId)
      .select(
        'li.id',
        'li.title',
        'li.status',
        'li.scheduled_start',
        'li.scheduled_end',
        's.name as subject_name',
        'c.name as class_name',
        'u.first_name as teacher_first_name',
        'u.last_name as teacher_last_name',
      );

    const rows = await query as Array<Record<string, unknown>>;

    return rows.map((row) => this.mapAdminLessonRow(row));
  }

  async countAdminLessonsForSchool(
    schoolId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<number> {
    const { page, limit, ...filters } = params;
    const query = this.baseLessonInstanceQuery(filters, false)
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id')
      .join('classes as c', 'cs.class_id', 'c.id')
      .where('c.school_id', schoolId);

    const result = await query.clone().count<{ count: string }>('li.id as count').first();
    return Number(result?.count ?? 0);
  }

  async findLessonInstancesByClassSubjectId(
    classSubjectId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<LessonInstance[]> {
    const query = this.baseLessonInstanceQuery(params)
      .where('li.class_subject_id', classSubjectId);

    return await query.select('li.*');
  }

  async findLessonInstancesByTeacherId(
    teacherId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<LessonInstance[]> {
    const query = this.baseLessonInstanceQuery(params)
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id');

    this.applyTeacherFilter(query, teacherId);

    return await query.select('li.*');
  }

  async countLessonInstancesByTeacherId(
    teacherId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<number> {
    const query = this.baseLessonInstanceQuery(params, false)
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id');

    this.applyTeacherFilter(query, teacherId);

    const result = await query.clone().count<{ count: string }>('li.id as count').first();
    return Number(result?.count ?? 0);
  }

  async findTeacherLessonsForDate(
    teacherId: string,
    startOfDay: Date,
    endOfDay: Date,
  ): Promise<TeacherLessonSummary[]> {
    const lessons = await this.db('lesson_instances as li')
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id')
      .join('classes as c', 'cs.class_id', 'c.id')
      .join('subjects as s', 'cs.subject_id', 's.id')
      .leftJoin('attendance_sessions as ats', 'li.id', 'ats.lesson_instance_id')
      .where('li.is_active', true)
      .andWhere('li.scheduled_start', '>=', startOfDay)
      .andWhere('li.scheduled_start', '<', endOfDay)
      .modify((query) => this.applyTeacherFilter(query, teacherId))
      .select(
        'li.*',
        'cs.class_id as class_id',
        'c.name as class_name',
        'c.grade_level as class_grade_level',
        'c.section as class_section',
        'c.academic_year as class_academic_year',
        's.id as subject_id',
        's.name as subject_name',
        's.code as subject_code',
        's.category as subject_category',
        'ats.id as attendance_session_id',
        'ats.is_finalized as attendance_is_finalized',
        'ats.opened_at as attendance_opened_at',
        'ats.closed_at as attendance_closed_at',
      )
      .orderBy('li.scheduled_start', 'asc');

    return lessons.map((lesson) => this.mapLessonSummaryRow(lesson));
  }

  async findTeacherLessonById(
    teacherId: string,
    lessonInstanceId: string,
  ): Promise<TeacherLessonSummary | null> {
    const row = await this.db('lesson_instances as li')
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id')
      .join('classes as c', 'cs.class_id', 'c.id')
      .join('subjects as s', 'cs.subject_id', 's.id')
      .leftJoin('attendance_sessions as ats', 'li.id', 'ats.lesson_instance_id')
      .where('li.is_active', true)
      .andWhere('li.id', lessonInstanceId)
      .modify((query) => this.applyTeacherFilter(query, teacherId))
      .select(
        'li.*',
        'cs.class_id as class_id',
        'c.name as class_name',
        'c.grade_level as class_grade_level',
        'c.section as class_section',
        'c.academic_year as class_academic_year',
        's.id as subject_id',
        's.name as subject_name',
        's.code as subject_code',
        's.category as subject_category',
        'ats.id as attendance_session_id',
        'ats.is_finalized as attendance_is_finalized',
        'ats.opened_at as attendance_opened_at',
        'ats.closed_at as attendance_closed_at',
      )
      .first();

    return row ? this.mapLessonSummaryRow(row) : null;
  }

  async getLessonAttendanceStatus(lessonInstanceId: string): Promise<{
    attendance_session_id: string | null;
    attendance_status: 'not_started' | 'in_progress' | 'finalized';
  }> {
    const attendance = await this.db('attendance_sessions')
      .where('lesson_instance_id', lessonInstanceId)
      .first('id', 'is_finalized', 'opened_at', 'closed_at');

    if (!attendance) {
      return {
        attendance_session_id: null,
        attendance_status: 'not_started',
      };
    }

    return {
      attendance_session_id: attendance.id,
      attendance_status: attendance.is_finalized
        ? 'finalized'
        : attendance.closed_at
          ? 'in_progress'
          : 'in_progress',
    };
  }

  async findLessonInstanceById(id: string): Promise<LessonInstance | null> {
    const record = await this.db('lesson_instances as li')
      .where('li.id', id)
      .where('li.is_active', true)
      .first('li.*');

    return record || null;
  }

  async createLessonInstance(data: CreateLessonInstanceDBPayload): Promise<string> {
    const [record] = await this.db('lesson_instances')
      .insert({
        id: this.generateUUID(),
        class_subject_id: data.class_subject_id,
        schedule_slot_id: data.schedule_slot_id ?? null,
        scheduled_start: data.scheduled_start,
        scheduled_end: data.scheduled_end,
        status: 'planned',
        title: data.title ?? null,
        description: data.description ?? null,
        objectives: JSON.stringify(data.objectives ?? []),
        materials: JSON.stringify(data.materials ?? []),
        notes: data.notes ?? null,
        cancellation_reason: null,
        created_by: data.created_by ?? null,
        updated_by: data.created_by ?? null,
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');

    return record.id;
  }

  async updateLessonInstance(id: string, data: UpdateLessonInstanceDBPayload): Promise<void> {
    const updatePayload: Record<string, unknown> = {
      updated_at: new Date(),
    };

    if (data.schedule_slot_id !== undefined) updatePayload.schedule_slot_id = data.schedule_slot_id;
    if (data.scheduled_start !== undefined) updatePayload.scheduled_start = data.scheduled_start;
    if (data.scheduled_end !== undefined) updatePayload.scheduled_end = data.scheduled_end;
    if (data.actual_start !== undefined) updatePayload.actual_start = data.actual_start;
    if (data.actual_end !== undefined) updatePayload.actual_end = data.actual_end;
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.title !== undefined) updatePayload.title = data.title;
    if (data.description !== undefined) updatePayload.description = data.description;
    if (data.objectives !== undefined) updatePayload.objectives = JSON.stringify(data.objectives);
    if (data.materials !== undefined) updatePayload.materials = JSON.stringify(data.materials);
    if (data.notes !== undefined) updatePayload.notes = data.notes;
    if (data.cancellation_reason !== undefined) updatePayload.cancellation_reason = data.cancellation_reason;
    if (data.is_active !== undefined) updatePayload.is_active = data.is_active;
    if (data.updated_by !== undefined) updatePayload.updated_by = data.updated_by;

    await this.db('lesson_instances')
      .where('id', id)
      .update(updatePayload);
  }

  async softDeleteLessonInstance(id: string, updatedBy?: string | null): Promise<void> {
    await this.db('lesson_instances')
      .where('id', id)
      .update({
        is_active: false,
        updated_by: updatedBy ?? null,
        updated_at: new Date(),
      });
  }

  async getScheduleTemplateById(id: string): Promise<ScheduleTemplate | null> {
    const record = await this.db('schedule_templates')
      .where('id', id)
      .first();

    return record || null;
  }

  async listScheduleTemplatesByClassSubject(classSubjectId: string): Promise<ScheduleTemplate[]> {
    return await this.db('schedule_templates')
      .where('class_subject_id', classSubjectId)
      .orderBy('effective_from', 'desc');
  }

  async createScheduleTemplate(data: Omit<ScheduleTemplate, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const [record] = await this.db('schedule_templates')
      .insert({
        id: this.generateUUID(),
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');

    return record.id;
  }

  async updateScheduleTemplate(id: string, data: Partial<ScheduleTemplate>): Promise<void> {
    const payload = { ...data, updated_at: new Date() } as Record<string, unknown>;
    delete (payload as any).id;

    await this.db('schedule_templates')
      .where('id', id)
      .update(payload);
  }

  async deleteScheduleTemplate(id: string): Promise<void> {
    await this.db('schedule_templates')
      .where('id', id)
      .delete();
  }

  async listTemplateSlots(templateId: string): Promise<ScheduleTemplateSlot[]> {
    return await this.db('schedule_template_slots')
      .where('template_id', templateId)
      .orderBy(['weekday', 'start_time']);
  }

  async createTemplateSlot(data: Omit<ScheduleTemplateSlot, 'id' | 'created_at' | 'updated_at'>): Promise<string> {
    const [record] = await this.db('schedule_template_slots')
      .insert({
        id: this.generateUUID(),
        ...data,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning('id');

    return record.id;
  }

  async deleteTemplateSlot(id: string): Promise<void> {
    await this.db('schedule_template_slots')
      .where('id', id)
      .delete();
  }

  async countLessonInstancesByClassId(
    classId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<number> {
    const query = this.baseLessonInstanceQuery(params, false)
      .join('class_subjects as cs', 'li.class_subject_id', 'cs.id')
      .where('cs.class_id', classId);

    const result = await query.clone().count<{ count: string }>('li.id as count').first();
    return Number(result?.count ?? 0);
  }

  async countLessonInstancesByClassSubjectId(
    classSubjectId: string,
    params: LessonInstanceQueryParams = {},
  ): Promise<number> {
    const query = this.baseLessonInstanceQuery(params, false)
      .where('li.class_subject_id', classSubjectId);

    const result = await query.clone().count<{ count: string }>('li.id as count').first();
    return Number(result?.count ?? 0);
  }

  private baseLessonInstanceQuery(params: LessonInstanceQueryParams = {}, includePagination: boolean = true) {
    let query = this.db('lesson_instances as li')
      .where('li.is_active', true);

    if (params.status) {
      query = query.where('li.status', params.status);
    }

    if (params.from) {
      query = query.where('li.scheduled_start', '>=', params.from);
    }

    if (params.to) {
      query = query.where('li.scheduled_end', '<=', params.to);
    }

    if (includePagination) {
      query = query.orderBy('li.scheduled_start', 'desc');

      if (params.limit) {
        query = query.limit(params.limit);
      }

      if (params.page && params.limit) {
        const offset = (params.page - 1) * params.limit;
        query = query.offset(offset);
      }
    }

    return query;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  private applyTeacherFilter(query: Knex.QueryBuilder, teacherId: string): Knex.QueryBuilder {
    return query.where(function () {
      this.where('cs.teacher_id', teacherId)
        .orWhereExists(function () {
          this.select('*')
            .from('class_offering_teachers as cot')
            .whereRaw('cot.class_offering_id = cs.class_offering_id')
            .andWhere('cot.teacher_id', teacherId)
            .andWhere('cot.is_active', true);
        })
        .orWhereExists(function () {
          this.select('*')
            .from('class_offerings as co')
            .whereRaw('co.id = cs.class_offering_id')
            .andWhere('co.primary_teacher_id', teacherId);
        });
    });
  }

  private mapLessonSummaryRow(row: any): TeacherLessonSummary {
    const attendanceStatus: 'not_started' | 'in_progress' | 'finalized' = row.attendance_session_id
      ? row.attendance_is_finalized
        ? 'finalized'
        : 'in_progress'
      : 'not_started';

    const scheduledStart = this.ensureDateString(row.scheduled_start);
    const scheduledEnd = this.ensureDateString(row.scheduled_end);
    const actualStart = this.normalizeDateValue(row.actual_start);
    const actualEnd = this.normalizeDateValue(row.actual_end);
    const createdAt = this.ensureDateString(row.created_at);
    const updatedAt = this.ensureDateString(row.updated_at);

    return {
      id: row.id,
      class_subject_id: row.class_subject_id,
      schedule_slot_id: row.schedule_slot_id,
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      actual_start: actualStart,
      actual_end: actualEnd,
      status: row.status,
      title: row.title,
      description: row.description,
      objectives: this.parseStringArray(row.objectives),
      materials: this.parseMaterialsArray(row.materials),
      notes: row.notes,
      cancellation_reason: row.cancellation_reason,
      created_by: row.created_by,
      updated_by: row.updated_by,
      is_active: row.is_active,
      created_at: createdAt,
      updated_at: updatedAt,
      class: row.class_id
        ? {
            id: row.class_id,
            name: row.class_name,
            grade_level: row.class_grade_level,
            section: row.class_section,
            academic_year: row.class_academic_year,
          }
        : undefined,
      subject: row.subject_id
        ? {
            id: row.subject_id,
            name: row.subject_name,
            code: row.subject_code,
            category: row.subject_category,
          }
        : undefined,
      class_name: row.class_name,
      subject_name: row.subject_name,
      attendance_session_id: row.attendance_session_id ?? null,
      attendance_status: attendanceStatus,
    };
  }

  private normalizeDateValue(value: unknown): string | null {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) {
        return null;
      }
      const parsed = new Date(trimmed);
      if (Number.isNaN(parsed.getTime())) {
        return trimmed;
      }
      return parsed.toISOString();
    }
    return null;
  }

  private ensureDateString(value: unknown): string {
    const normalized = this.normalizeDateValue(value);
    if (normalized) {
      return normalized;
    }
    if (value) {
      const parsed = new Date(value as string | number | Date);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed.toISOString();
      }
      return String(value);
    }
    // Fallback to current time; this should rarely happen but keeps return type consistent
    return new Date().toISOString();
  }

  private parseJsonArray(value: unknown): unknown[] {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(value as string);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  private parseStringArray(value: unknown): string[] {
    return this.parseJsonArray(value)
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim());
  }

  private parseMaterialsArray(value: unknown): Record<string, unknown>[] {
    return this.parseJsonArray(value)
      .filter((item): item is Record<string, unknown> => item !== null && typeof item === 'object');
  }
}
 