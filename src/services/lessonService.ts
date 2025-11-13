import { LessonRepository } from '../repositories/lessonRepository';
import { AuthenticatedUser } from '../types/user';
import {
  LessonInstance,
  LessonInstanceQueryParams,
  CreateLessonInstanceRequest,
  UpdateLessonInstanceRequest,
  ScheduleTemplate,
  ScheduleTemplateSlot,
  TeacherLessonDashboardResponse,
  TeacherLessonSummary,
  UpdateLessonStatusRequest,
} from '../types/lesson';

export class LessonService {
  constructor(private lessonRepository: LessonRepository) {}

  async listLessonInstancesForClass(
    classId: string,
    currentUser: AuthenticatedUser,
    params: LessonInstanceQueryParams = {},
  ): Promise<LessonInstance[]> {
    await this.verifyClassAccess(classId, currentUser);
    return await this.lessonRepository.findLessonInstancesByClassId(classId, params);
  }

  async listLessonInstancesForClassSubject(
    classSubjectId: string,
    currentUser: AuthenticatedUser,
    params: LessonInstanceQueryParams = {},
  ): Promise<LessonInstance[]> {
    await this.verifyClassSubjectAccess(classSubjectId, currentUser);
    return await this.lessonRepository.findLessonInstancesByClassSubjectId(classSubjectId, params);
  }

  async countLessonInstancesForClass(
    classId: string,
    currentUser: AuthenticatedUser,
    params: LessonInstanceQueryParams = {},
  ): Promise<number> {
    await this.verifyClassAccess(classId, currentUser);
    const { page, limit, ...rest } = params;
    return await this.lessonRepository.countLessonInstancesByClassId(classId, rest);
  }

  async countLessonInstancesForClassSubject(
    classSubjectId: string,
    currentUser: AuthenticatedUser,
    params: LessonInstanceQueryParams = {},
  ): Promise<number> {
    await this.verifyClassSubjectAccess(classSubjectId, currentUser);
    const { page, limit, ...rest } = params;
    return await this.lessonRepository.countLessonInstancesByClassSubjectId(classSubjectId, rest);
  }

  async getLessonInstanceById(
    lessonInstanceId: string,
    currentUser: AuthenticatedUser,
  ): Promise<LessonInstance> {
    const lessonInstance = await this.lessonRepository.findLessonInstanceById(lessonInstanceId);
    if (!lessonInstance) {
      throw new Error('Lesson instance not found');
    }

    await this.verifyClassSubjectAccess(lessonInstance.class_subject_id, currentUser);
    return lessonInstance;
  }

  async getTeacherDailyLessons(
    currentUser: AuthenticatedUser,
    dateInput?: string,
  ): Promise<TeacherLessonDashboardResponse> {
    this.ensureTeacherContext(currentUser);

    const { startOfDay, endOfDay, isoDate } = this.getDateRange(dateInput);

    const lessons = await this.lessonRepository.findTeacherLessonsForDate(
      currentUser.id,
      startOfDay,
      endOfDay,
    );

    return {
      date: isoDate,
      lessons,
      total: lessons.length,
    };
  }

  async getTeacherLessonSummary(
    lessonInstanceId: string,
    currentUser: AuthenticatedUser,
  ): Promise<TeacherLessonSummary> {
    this.ensureTeacherContext(currentUser);

    const lesson = await this.lessonRepository.findTeacherLessonById(
      currentUser.id,
      lessonInstanceId,
    );

    if (!lesson) {
      throw new Error('Lesson instance not found');
    }

    return lesson;
  }

  async updateTeacherLessonStatus(
    lessonInstanceId: string,
    payload: UpdateLessonStatusRequest,
    currentUser: AuthenticatedUser,
  ): Promise<TeacherLessonSummary> {
    this.ensureTeacherContext(currentUser);

    const lesson = await this.lessonRepository.findTeacherLessonById(
      currentUser.id,
      lessonInstanceId,
    );

    if (!lesson) {
      throw new Error('Lesson instance not found');
    }

    const updatePayload: UpdateLessonInstanceRequest = {
      status: payload.status,
    };

    if (payload.status === 'in_session') {
      updatePayload.actual_start = payload.actual_start ?? new Date().toISOString();
      updatePayload.actual_end = null;
    }

    if (payload.status === 'completed') {
      updatePayload.actual_end = payload.actual_end ?? new Date().toISOString();
      if (!lesson.actual_start) {
        updatePayload.actual_start = payload.actual_start ?? updatePayload.actual_end;
      }
    }

    await this.lessonRepository.updateLessonInstance(lessonInstanceId, {
      ...updatePayload,
      updated_by: currentUser.id,
    });

    const updatedLesson = await this.lessonRepository.findTeacherLessonById(
      currentUser.id,
      lessonInstanceId,
    );

    if (!updatedLesson) {
      throw new Error('Failed to update lesson status');
    }

    return updatedLesson;
  }

  async createLessonInstance(
    payload: CreateLessonInstanceRequest,
    currentUser: AuthenticatedUser,
  ): Promise<LessonInstance> {
    await this.verifyClassSubjectAccess(payload.class_subject_id, currentUser, true);

    const lessonInstanceId = await this.lessonRepository.createLessonInstance({
      ...payload,
      created_by: currentUser.id,
    });

    const lessonInstance = await this.lessonRepository.findLessonInstanceById(lessonInstanceId);
    if (!lessonInstance) {
      throw new Error('Failed to create lesson instance');
    }

    return lessonInstance;
  }

  async updateLessonInstance(
    lessonInstanceId: string,
    payload: UpdateLessonInstanceRequest,
    currentUser: AuthenticatedUser,
  ): Promise<LessonInstance> {
    const existing = await this.lessonRepository.findLessonInstanceById(lessonInstanceId);
    if (!existing) {
      throw new Error('Lesson instance not found');
    }

    await this.verifyClassSubjectAccess(existing.class_subject_id, currentUser, true);

    await this.lessonRepository.updateLessonInstance(lessonInstanceId, {
      ...payload,
      updated_by: currentUser.id,
    });

    const updated = await this.lessonRepository.findLessonInstanceById(lessonInstanceId);
    if (!updated) {
      throw new Error('Failed to update lesson instance');
    }

    return updated;
  }

  async cancelLessonInstance(
    lessonInstanceId: string,
    currentUser: AuthenticatedUser,
    reason?: string,
  ): Promise<void> {
    const existing = await this.lessonRepository.findLessonInstanceById(lessonInstanceId);
    if (!existing) {
      throw new Error('Lesson instance not found');
    }

    await this.verifyClassSubjectAccess(existing.class_subject_id, currentUser, true);
    await this.lessonRepository.updateLessonInstance(lessonInstanceId, {
      status: 'cancelled',
      cancellation_reason: reason ?? null,
      updated_by: currentUser.id,
    });
  }

  async deleteLessonInstance(
    lessonInstanceId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const existing = await this.lessonRepository.findLessonInstanceById(lessonInstanceId);
    if (!existing) {
      throw new Error('Lesson instance not found');
    }

    await this.verifyClassSubjectAccess(existing.class_subject_id, currentUser, true);
    await this.lessonRepository.softDeleteLessonInstance(lessonInstanceId, currentUser.id);
  }

  async listScheduleTemplates(
    classSubjectId: string,
    currentUser: AuthenticatedUser,
  ): Promise<ScheduleTemplate[]> {
    await this.verifyClassSubjectAccess(classSubjectId, currentUser, true);
    return await this.lessonRepository.listScheduleTemplatesByClassSubject(classSubjectId);
  }

  async createScheduleTemplate(
    data: Omit<ScheduleTemplate, 'id' | 'created_at' | 'updated_at'>,
    currentUser: AuthenticatedUser,
  ): Promise<ScheduleTemplate> {
    await this.verifyClassSubjectAccess(data.class_subject_id, currentUser, true);

    const templateId = await this.lessonRepository.createScheduleTemplate({
      ...data,
      created_by: data.created_by ?? currentUser.id,
    });

    const template = await this.lessonRepository.getScheduleTemplateById(templateId);
    if (!template) {
      throw new Error('Failed to create schedule template');
    }

    return template;
  }

  async updateScheduleTemplate(
    templateId: string,
    data: Partial<ScheduleTemplate>,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const existing = await this.lessonRepository.getScheduleTemplateById(templateId);
    if (!existing) {
      throw new Error('Schedule template not found');
    }

    await this.verifyClassSubjectAccess(existing.class_subject_id, currentUser, true);
    await this.lessonRepository.updateScheduleTemplate(templateId, data);
  }

  async deleteScheduleTemplate(
    templateId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const existing = await this.lessonRepository.getScheduleTemplateById(templateId);
    if (!existing) {
      throw new Error('Schedule template not found');
    }

    await this.verifyClassSubjectAccess(existing.class_subject_id, currentUser, true);
    await this.lessonRepository.deleteScheduleTemplate(templateId);
  }

  async listTemplateSlots(
    templateId: string,
    currentUser: AuthenticatedUser,
  ): Promise<ScheduleTemplateSlot[]> {
    const template = await this.lessonRepository.getScheduleTemplateById(templateId);
    if (!template) {
      throw new Error('Schedule template not found');
    }

    await this.verifyClassSubjectAccess(template.class_subject_id, currentUser, true);
    return await this.lessonRepository.listTemplateSlots(templateId);
  }

  async createTemplateSlot(
    templateId: string,
    data: Omit<ScheduleTemplateSlot, 'id' | 'created_at' | 'updated_at'>,
    currentUser: AuthenticatedUser,
  ): Promise<string> {
    const template = await this.lessonRepository.getScheduleTemplateById(templateId);
    if (!template) {
      throw new Error('Schedule template not found');
    }

    await this.verifyClassSubjectAccess(template.class_subject_id, currentUser, true);
    return await this.lessonRepository.createTemplateSlot({ ...data, template_id: templateId });
  }

  async deleteTemplateSlot(
    templateId: string,
    slotId: string,
    currentUser: AuthenticatedUser,
  ): Promise<void> {
    const template = await this.lessonRepository.getScheduleTemplateById(templateId);
    if (!template) {
      throw new Error('Schedule template not found');
    }

    await this.verifyClassSubjectAccess(template.class_subject_id, currentUser, true);
    await this.lessonRepository.deleteTemplateSlot(slotId);
  }

  private async verifyClassAccess(classId: string, currentUser: AuthenticatedUser): Promise<void> {
    // Import classRepository to check class access
    const { ClassRepository } = await import('../repositories/classRepository');
    const { UserClassRepository } = await import('../repositories/userClassRepository');
    const db = await import('../config/database');
    
    const classRepository = new ClassRepository(db.default);
    const userClassRepository = new UserClassRepository(db.default);

    // Admins can access all classes in their school
    if (currentUser.role === 'admin') {
      const classItem = await classRepository.findById(classId);
      if (!classItem) {
        throw new Error('Class not found');
      }
      if (classItem.school_id !== currentUser.school_id) {
        throw new Error('Access denied to this class');
      }
      return;
    }

    // Regular users need to be enrolled in the class
    const hasAccess = await userClassRepository.checkUserClassAccess(currentUser.id, classId);
    if (!hasAccess) {
      throw new Error('Access denied to this class');
    }
  }

  private async verifyClassSubjectAccess(
    classSubjectId: string,
    currentUser: AuthenticatedUser,
    requireTeachingPrivilege: boolean = false,
  ): Promise<void> {
    const db = await import('../config/database');

    // Fetch the class subject details via raw query for now
    const classSubject = await db.default('class_subjects')
      .where('id', classSubjectId)
      .where('is_active', true)
      .first();

    if (!classSubject) {
      throw new Error('Class subject not found');
    }

    await this.verifyClassAccess(classSubject.class_id, currentUser);

    if (requireTeachingPrivilege) {
      const isTeacher = currentUser.user_type === 'teacher';
      const isAdmin = currentUser.role === 'admin';

      if (!isAdmin) {
        if (!isTeacher) {
          throw new Error('Only teachers or admins can manage lesson schedules');
        }

        const isAssignedTeacher = classSubject.teacher_id === currentUser.id;
        if (!isAssignedTeacher) {
          const assignment = await db.default('class_offering_teachers')
            .where('class_offering_id', classSubject.class_offering_id)
            .where('teacher_id', currentUser.id)
            .where('is_active', true)
            .first();

          if (!assignment) {
            throw new Error('Access denied: not assigned to this subject');
          }
        }
      }
    }
  }

  private ensureTeacherContext(currentUser: AuthenticatedUser): void {
    if (currentUser.user_type !== 'teacher' && currentUser.role !== 'admin') {
      throw new Error('Teacher access required');
    }
  }

  private getDateRange(dateInput?: string): {
    startOfDay: Date;
    endOfDay: Date;
    isoDate: string;
  } {
    const date = dateInput ? new Date(dateInput) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }

    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    return {
      startOfDay,
      endOfDay,
      isoDate: startOfDay.toISOString().split('T')[0],
    };
  }
}
 