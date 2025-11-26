import { Knex } from 'knex';
import { AuthenticatedRequest } from '../types/auth';
import {
  GenerateReportCardsRequest,
  ListReportCardsQuery,
  ReportCardDetail,
  ReportCardSummary,
  ReportCardSubject,
} from '../types/reportCard';

type AuthenticatedUser = AuthenticatedRequest['user'];

export class ReportCardService {
  constructor(private db: Knex) {}

  private ensureAdmin(currentUser: AuthenticatedUser) {
    if (!currentUser || currentUser.role !== 'admin') {
      throw new Error('Admin access required');
    }
  }

  async generateReportCards(
    payload: GenerateReportCardsRequest,
    currentUser: AuthenticatedUser,
  ): Promise<{ report_cards: ReportCardSummary[]; generated_count: number }> {
    this.ensureAdmin(currentUser);

    const { class_id, academic_period_id, student_ids, regenerate } = payload;

    if (!class_id || !academic_period_id) {
      throw new Error('class_id and academic_period_id are required');
    }

    const classRow = await this.db('classes').where('id', class_id).first();
    if (!classRow) {
      throw new Error('Class not found');
    }

    if (currentUser.school_id && classRow.school_id !== currentUser.school_id) {
      throw new Error('Access denied to this class');
    }

    const periodRow = await this.db('academic_periods as ap')
      .join('academic_years as ay', 'ap.academic_year_id', 'ay.id')
      .where('ap.id', academic_period_id)
      .andWhere('ay.school_id', classRow.school_id)
      .first();

    if (!periodRow) {
      throw new Error('Academic period not found for this school');
    }

    let studentsQuery = this.db('user_classes as uc')
      .join('users as u', 'uc.user_id', 'u.id')
      .where('uc.class_id', class_id)
      .where('uc.is_active', true)
      .where('u.is_active', true)
      .where('u.user_type', 'student');

    if (student_ids && student_ids.length > 0) {
      studentsQuery = studentsQuery.whereIn('uc.user_id', student_ids);
    }

    const students = await studentsQuery.select(
      'u.id as student_id',
      'u.first_name',
      'u.last_name',
      'u.student_id as student_number',
    );

    if (students.length === 0) {
      return { report_cards: [], generated_count: 0 };
    }

    const studentIdList = students.map((s: any) => s.student_id);

    const finalGrades = await this.db('final_grades as fg')
      .join('class_offerings as co', 'fg.class_offering_id', 'co.id')
      .join('subjects as s', 'co.subject_id', 's.id')
      .leftJoin('users as t', 'co.primary_teacher_id', 't.id')
      .where('co.class_id', class_id)
      .where('co.academic_period_id', academic_period_id)
      .whereIn('fg.student_id', studentIdList)
      .select(
        'fg.id as final_grade_id',
        'fg.student_id',
        'fg.class_offering_id',
        'fg.numeric_grade',
        'fg.letter_grade',
        'fg.is_passing',
        'co.subject_id',
        's.name as subject_name',
        's.code as subject_code',
        't.id as teacher_id',
        this.db.raw("TRIM(COALESCE(t.first_name, '') || ' ' || COALESCE(t.last_name, '')) as teacher_name"),
      );

    const gradesByStudent = new Map<string, any[]>();
    for (const row of finalGrades as any[]) {
      const key = row.student_id as string;
      if (!gradesByStudent.has(key)) {
        gradesByStudent.set(key, []);
      }
      gradesByStudent.get(key)!.push(row);
    }

    const now = new Date();
    const summaries: ReportCardSummary[] = [];

    for (const student of students as any[]) {
      const studentId = student.student_id as string;
      const studentGrades = gradesByStudent.get(studentId) || [];

      if (studentGrades.length === 0) {
        continue;
      }

      let reportCard = await this.db('report_cards')
        .where('student_id', studentId)
        .andWhere('class_id', class_id)
        .andWhere('academic_period_id', academic_period_id)
        .first();

      if (reportCard && regenerate) {
        await this.db('report_card_subjects')
          .where('report_card_id', reportCard.id)
          .del();

        await this.db('report_cards')
          .where('id', reportCard.id)
          .update({
            generated_at: now,
            updated_at: now,
          });
      }

      if (!reportCard) {
        const [inserted] = await this.db('report_cards')
          .insert({
            student_id: studentId,
            class_id,
            academic_period_id,
            homeroom_teacher_id: null,
            promotion_status: null,
            is_published: false,
            is_locked: false,
            generated_at: now,
            finalized_at: null,
            published_at: null,
            published_by: null,
            locked_at: null,
            locked_by: null,
            general_remark: null,
            metadata: null,
            created_at: now,
            updated_at: now,
          })
          .returning('*');

        reportCard = inserted;
      }

      for (const gradeRow of studentGrades) {
        const subject: ReportCardSubject = {
          id: '',
          report_card_id: reportCard.id,
          class_offering_id: gradeRow.class_offering_id,
          final_grade_id: gradeRow.final_grade_id,
          subject_id: gradeRow.subject_id,
          subject_name: gradeRow.subject_name,
          subject_code: gradeRow.subject_code,
          teacher_id: gradeRow.teacher_id,
          teacher_name: gradeRow.teacher_name,
          numeric_grade: gradeRow.numeric_grade,
          letter_grade: gradeRow.letter_grade,
          is_passing: gradeRow.is_passing,
          sequence: null,
          metadata: null,
          created_at: now,
          updated_at: now,
        };

        await this.db('report_card_subjects').insert({
          id: this.generateUUID(),
          report_card_id: subject.report_card_id,
          class_offering_id: subject.class_offering_id,
          final_grade_id: subject.final_grade_id,
          subject_id: subject.subject_id,
          subject_name: subject.subject_name,
          subject_code: subject.subject_code,
          teacher_id: subject.teacher_id,
          teacher_name: subject.teacher_name,
          numeric_grade: subject.numeric_grade,
          letter_grade: subject.letter_grade,
          is_passing: subject.is_passing,
          sequence: subject.sequence,
          metadata: subject.metadata,
          created_at: subject.created_at,
          updated_at: subject.updated_at,
        });
      }

      const summary: ReportCardSummary = {
        id: reportCard.id,
        student_id: reportCard.student_id,
        class_id: reportCard.class_id,
        academic_period_id: reportCard.academic_period_id,
        homeroom_teacher_id: reportCard.homeroom_teacher_id,
        promotion_status: reportCard.promotion_status,
        is_published: reportCard.is_published,
        is_locked: reportCard.is_locked,
        generated_at: reportCard.generated_at,
        finalized_at: reportCard.finalized_at,
        published_at: reportCard.published_at,
        published_by: reportCard.published_by,
        locked_at: reportCard.locked_at,
        locked_by: reportCard.locked_by,
        general_remark: reportCard.general_remark,
        metadata: reportCard.metadata,
        created_at: reportCard.created_at,
        updated_at: reportCard.updated_at,
        student: {
          id: student.student_id,
          first_name: student.first_name,
          last_name: student.last_name,
          student_number: student.student_number,
        },
      };

      summaries.push(summary);
    }

    return { report_cards: summaries, generated_count: summaries.length };
  }

  async listReportCards(
    params: ListReportCardsQuery,
    currentUser: AuthenticatedUser,
  ): Promise<{ report_cards: ReportCardSummary[]; pagination: { page: number; limit: number; total: number; hasMore: boolean } }> {
    const page = params.page && params.page > 0 ? params.page : 1;
    const limit = params.limit && params.limit > 0 ? params.limit : 20;

    if (!params.class_id || !params.academic_period_id) {
      throw new Error('class_id and academic_period_id are required');
    }

    if (!currentUser) {
      throw new Error('Authentication required');
    }

    let query = this.db('report_cards as rc')
      .join('users as u', 'rc.student_id', 'u.id')
      .where('rc.class_id', params.class_id)
      .where('rc.academic_period_id', params.academic_period_id)
      .where('u.is_active', true);

    if (currentUser.role === 'admin') {
      // no additional filtering
    } else if (currentUser.user_type === 'teacher') {
      query = query.whereExists((qb) => {
        qb.from('report_card_subjects as rcs')
          .join('class_offerings as co', 'rcs.class_offering_id', 'co.id')
          .whereRaw('rc.id = rcs.report_card_id')
          .andWhere('co.primary_teacher_id', currentUser.id);
      });
    } else if (currentUser.user_type === 'student') {
      query = query.where('rc.student_id', currentUser.id);
    } else if (currentUser.user_type === 'parent') {
      const relations = await this.db('parent_student_relationships')
        .where('parent_id', currentUser.id)
        .where('is_active', true)
        .select('student_id');

      const studentIds = relations.map((r: any) => r.student_id);

      if (studentIds.length === 0) {
        return {
          report_cards: [],
          pagination: {
            page,
            limit,
            total: 0,
            hasMore: false,
          },
        };
      }

      query = query.whereIn('rc.student_id', studentIds);
    } else {
      throw new Error('Access denied to report cards');
    }

    if (params.student_id) {
      query = query.where('rc.student_id', params.student_id);
    }

    const totalResult = await query.clone().count<{ count: string }>('rc.id as count').first();
    const total = Number(totalResult?.count ?? 0);

    const rows = await query
      .clone()
      .orderBy('u.last_name', 'asc')
      .orderBy('u.first_name', 'asc')
      .limit(limit)
      .offset((page - 1) * limit)
      .select(
        'rc.*',
        'u.first_name',
        'u.last_name',
        'u.student_id as student_number',
      );

    const report_cards: ReportCardSummary[] = (rows as any[]).map((row) => ({
      id: row.id,
      student_id: row.student_id,
      class_id: row.class_id,
      academic_period_id: row.academic_period_id,
      homeroom_teacher_id: row.homeroom_teacher_id,
      promotion_status: row.promotion_status,
      is_published: row.is_published,
      is_locked: row.is_locked,
      generated_at: row.generated_at,
      finalized_at: row.finalized_at,
      published_at: row.published_at,
      published_by: row.published_by,
      locked_at: row.locked_at,
      locked_by: row.locked_by,
      general_remark: row.general_remark,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      student: {
        id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        student_number: row.student_number,
      },
    }));

    return {
      report_cards,
      pagination: {
        page,
        limit,
        total,
        hasMore: page * limit < total,
      },
    };
  }

  private async ensureReportCardAccess(reportCard: any, currentUser: AuthenticatedUser): Promise<void> {
    if (!currentUser) {
      throw new Error('Authentication required');
    }

    if (currentUser.role === 'admin') {
      return;
    }

    if (currentUser.user_type === 'student' && currentUser.id === reportCard.student_id) {
      return;
    }

    if (currentUser.user_type === 'parent') {
      const relationship = await this.db('parent_student_relationships')
        .where('parent_id', currentUser.id)
        .where('student_id', reportCard.student_id)
        .where('is_active', true)
        .first();

      if (relationship) {
        return;
      }
    }

    if (currentUser.user_type === 'teacher') {
      const teaching = await this.db('class_offerings as co')
        .join('report_card_subjects as rcs', 'co.id', 'rcs.class_offering_id')
        .where('rcs.report_card_id', reportCard.id)
        .andWhere(function () {
          this.where('co.primary_teacher_id', currentUser.id);
        })
        .first();

      if (teaching) {
        return;
      }
    }

    throw new Error('Access denied to this report card');
  }

  async getReportCardById(
    id: string,
    currentUser: AuthenticatedUser,
  ): Promise<ReportCardDetail> {
    const row = await this.db('report_cards as rc')
      .join('users as u', 'rc.student_id', 'u.id')
      .join('classes as c', 'rc.class_id', 'c.id')
      .join('academic_periods as ap', 'rc.academic_period_id', 'ap.id')
      .join('academic_years as ay', 'ap.academic_year_id', 'ay.id')
      .where('rc.id', id)
      .select(
        'rc.*',
        'u.first_name',
        'u.last_name',
        'u.student_id as student_number',
        'c.name as class_name',
        'c.grade_level',
        'c.section',
        'ap.name as period_name',
        'ap.sequence as period_sequence',
        'ay.id as year_id',
        'ay.name as year_name',
      )
      .first();

    if (!row) {
      throw new Error('Report card not found');
    }

    await this.ensureReportCardAccess(row, currentUser);

    const subjectsRows = await this.db('report_card_subjects')
      .where('report_card_id', row.id)
      .orderBy('subject_name', 'asc')
      .select('*');

    const subjects: ReportCardSubject[] = (subjectsRows as any[]).map((s) => ({
      id: s.id,
      report_card_id: s.report_card_id,
      class_offering_id: s.class_offering_id,
      final_grade_id: s.final_grade_id,
      subject_id: s.subject_id,
      subject_name: s.subject_name,
      subject_code: s.subject_code,
      teacher_id: s.teacher_id,
      teacher_name: s.teacher_name,
      numeric_grade: s.numeric_grade,
      letter_grade: s.letter_grade,
      is_passing: s.is_passing,
      sequence: s.sequence,
      metadata: s.metadata,
      created_at: s.created_at,
      updated_at: s.updated_at,
    }));

    const detail: ReportCardDetail = {
      id: row.id,
      student_id: row.student_id,
      class_id: row.class_id,
      academic_period_id: row.academic_period_id,
      homeroom_teacher_id: row.homeroom_teacher_id,
      promotion_status: row.promotion_status,
      is_published: row.is_published,
      is_locked: row.is_locked,
      generated_at: row.generated_at,
      finalized_at: row.finalized_at,
      published_at: row.published_at,
      published_by: row.published_by,
      locked_at: row.locked_at,
      locked_by: row.locked_by,
      general_remark: row.general_remark,
      metadata: row.metadata,
      created_at: row.created_at,
      updated_at: row.updated_at,
      student: {
        id: row.student_id,
        first_name: row.first_name,
        last_name: row.last_name,
        student_number: row.student_number,
      },
      class: {
        id: row.class_id,
        name: row.class_name,
        grade_level: row.grade_level,
        section: row.section,
      },
      academic_period: {
        id: row.academic_period_id,
        name: row.period_name,
        sequence: row.period_sequence,
      },
      academic_year: {
        id: row.year_id,
        name: row.year_name,
      },
      subjects,
    };

    return detail;
  }

  private generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }
}
