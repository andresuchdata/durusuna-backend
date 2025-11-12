import { Knex } from 'knex';
import {
  LessonInstance,
  LessonInstanceQueryParams,
  CreateLessonInstanceRequest,
  UpdateLessonInstanceRequest,
  ScheduleTemplate,
  ScheduleTemplateSlot,
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

    query = query.orderBy('li.scheduled_start', 'desc');

    if (includePagination && params.limit) {
      query = query.limit(params.limit);
    }

    if (includePagination && params.page && params.limit) {
      const offset = (params.page - 1) * params.limit;
      query = query.offset(offset);
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
            .from('class_offerings as co')
            .whereRaw('co.id = cs.class_offering_id')
            .where('co.primary_teacher_id', teacherId);
        });
    });
  }
}
 