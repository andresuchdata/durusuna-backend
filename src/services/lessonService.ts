import { LessonRepository } from '../repositories/lessonRepository';
import { AuthenticatedUser } from '../types/user';
import { Lesson } from '../types/lesson';

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
    // Admins can see all lessons in their school
    if (currentUser.role === 'admin') {
      return await this.lessonRepository.findBySchoolId(currentUser.school_id);
    }
    
    // Teachers see only their lessons
    if (currentUser.user_type === 'teacher') {
      return await this.lessonRepository.findByTeacherId(currentUser.id);
    }
    
    // Students and other users see lessons in their school
    return await this.lessonRepository.findBySchoolId(currentUser.school_id);
  }

  async getLessonsByClass(classId: string, currentUser: AuthenticatedUser): Promise<Lesson[]> {
    // Verify user has access to this class
    await this.verifyClassAccess(classId, currentUser);
    return await this.lessonRepository.findByClassId(classId);
  }

  async getLessonById(lessonId: string, currentUser: AuthenticatedUser): Promise<Lesson> {
    const lesson = await this.lessonRepository.findById(lessonId);
    if (!lesson) {
      throw new Error('Lesson not found');
    }

    // Verify user has access to the lesson's class
    await this.verifyClassAccess(lesson.class_id, currentUser);
    
    return lesson;
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

  async createLesson(data: CreateLessonData, currentUser: AuthenticatedUser): Promise<Lesson> {
    // Only admins and teachers can create lessons
    if (currentUser.role !== 'admin' && currentUser.user_type !== 'teacher') {
      throw new Error('Only admins and teachers can create lessons');
    }

    // Verify access to the class
    await this.verifyClassAccess(data.class_id, currentUser);

    // Convert the data to match database schema
    const lessonData = {
      class_id: data.class_id,
      title: data.title,
      description: data.description,
      subject: data.lesson_type || 'General',
      start_time: data.lesson_date || new Date(),
      end_time: new Date(Date.now() + (data.duration_minutes || 60) * 60000),
      location: '',
      materials: data.attachments || [],
      settings: {}
    };

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

    // Verify access to the lesson's class
    await this.verifyClassAccess(existingLesson.class_id, currentUser);

    // Only admins and teachers can update lessons
    if (currentUser.role !== 'admin' && currentUser.user_type !== 'teacher') {
      throw new Error('Only admins and teachers can update lessons');
    }

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

    // Verify access to the lesson's class
    await this.verifyClassAccess(existingLesson.class_id, currentUser);

    // Only admins and teachers can delete lessons
    if (currentUser.role !== 'admin' && currentUser.user_type !== 'teacher') {
      throw new Error('Only admins and teachers can delete lessons');
    }

    await this.lessonRepository.delete(lessonId);
  }
} 