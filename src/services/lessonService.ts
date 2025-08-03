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
    // Get lessons based on user role and school
    if (currentUser.role === 'teacher') {
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

    // Check if user has access to this lesson - basic check for now
    // In a real app, you'd check class membership or school access
    
    return lesson;
  }

  async createLesson(data: CreateLessonData, currentUser: AuthenticatedUser): Promise<Lesson> {
    // Only teachers can create lessons
    if (currentUser.role !== 'teacher' && currentUser.role !== 'admin') {
      throw new Error('Only teachers can create lessons');
    }

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

    // Check permissions - simplified for now
    if (currentUser.role !== 'admin') {
      // TODO: Add proper permission checking based on class access
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

    // Check permissions - simplified for now
    if (currentUser.role !== 'admin') {
      // TODO: Add proper permission checking based on class access
    }

    await this.lessonRepository.delete(lessonId);
  }
} 