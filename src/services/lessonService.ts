import { LessonRepository } from '../repositories/lessonRepository';
import { AuthenticatedUser } from '../types/user';

export interface Lesson {
  id: string;
  title: string;
  description?: string;
  content?: string;
  class_id: string;
  school_id: string;
  teacher_id: string;
  lesson_date?: Date;
  duration_minutes?: number;
  lesson_type?: string;
  status: 'draft' | 'published' | 'archived';
  attachments?: any[];
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateLessonData {
  title: string;
  description?: string;
  content?: string;
  class_id: string;
  lesson_date?: Date;
  duration_minutes?: number;
  lesson_type?: string;
  status?: 'draft' | 'published';
  attachments?: any[];
}

export interface UpdateLessonData {
  title?: string;
  description?: string;
  content?: string;
  lesson_date?: Date;
  duration_minutes?: number;
  lesson_type?: string;
  status?: 'draft' | 'published' | 'archived';
  attachments?: any[];
}

export class LessonService {
  constructor(private lessonRepository: LessonRepository) {}

  async getAllLessons(currentUser: AuthenticatedUser): Promise<Lesson[]> {
    // Get lessons based on user type and school
    if (currentUser.user_type === 'teacher') {
      return await this.lessonRepository.findByTeacherId(currentUser.id);
    } else {
      return await this.lessonRepository.findBySchoolId(currentUser.school_id);
    }
  }

  async getLessonsByClass(classId: string, currentUser: AuthenticatedUser): Promise<Lesson[]> {
    // TODO: Verify user has access to this class
    return await this.lessonRepository.findByClassId(classId);
  }

  async getLessonById(lessonId: string, currentUser: AuthenticatedUser): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Check if user has access to this lesson's school
    if (currentUser.role !== 'admin' && currentUser.school_id !== lesson.school_id) {
      throw new Error('Access denied');
    }

    return lesson;
  }

  async createLesson(data: CreateLessonData, currentUser: AuthenticatedUser): Promise<Lesson> {
    // Only teachers can create lessons
    if (currentUser.user_type !== 'teacher' && currentUser.role !== 'admin') {
      throw new Error('Only teachers can create lessons');
    }

    // Set teacher_id and school_id
    const lessonData = {
      ...data,
      teacher_id: currentUser.id,
      school_id: currentUser.school_id,
      status: data.status || 'draft'
    };

    // TODO: Verify user has access to the specified class
    // TODO: Add validation with Zod schema
    const lessonId = await this.lessonRepository.create(lessonData);
    
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new Error('Failed to create lesson');
    }

    return lesson;
  }

  async updateLesson(lessonId: string, data: UpdateLessonData, currentUser: AuthenticatedUser): Promise<Lesson> {
    const existingLesson = await this.lessonRepository.findById(lessonId);
    if (!existingLesson) {
      throw new Error('Lesson not found');
    }

    // Check permissions
    if (currentUser.role !== 'admin' && 
        (currentUser.school_id !== existingLesson.school_id || 
         currentUser.id !== existingLesson.teacher_id)) {
      throw new Error('Access denied');
    }

    // TODO: Add validation with Zod schema
    await this.lessonRepository.update(lessonId, data);
    
    const updatedLesson = await this.lessonRepository.findById(lessonId);
    if (!updatedLesson) {
      throw new Error('Failed to update lesson');
    }

    return updatedLesson;
  }

  async deleteLesson(lessonId: string, currentUser: AuthenticatedUser): Promise<void> {
    const existingLesson = await this.lessonRepository.findById(lessonId);
    if (!existingLesson) {
      throw new Error('Lesson not found');
    }

    // Check permissions
    if (currentUser.role !== 'admin' && 
        (currentUser.school_id !== existingLesson.school_id || 
         currentUser.id !== existingLesson.teacher_id)) {
      throw new Error('Access denied');
    }

    await this.lessonRepository.delete(lessonId);
  }
} 