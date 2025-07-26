import { ClassRepository } from '../repositories/classRepository';
import { AuthenticatedUser } from '../types/user';

export interface Class {
  id: string;
  name: string;
  description?: string;
  grade_level?: string;
  section?: string;
  academic_year: string;
  school_id: string;
  settings?: Record<string, any>;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface CreateClassData {
  name: string;
  description?: string;
  grade_level?: string;
  section?: string;
  academic_year: string;
  school_id: string;
  settings?: Record<string, any>;
}

export interface UpdateClassData {
  name?: string;
  description?: string;
  grade_level?: string;
  section?: string;
  academic_year?: string;
  settings?: Record<string, any>;
}

export class ClassService {
  constructor(private classRepository: ClassRepository) {}

  async getAllClasses(currentUser: AuthenticatedUser): Promise<Class[]> {
    // Users can only see classes in their school
    return await this.classRepository.findBySchoolId(currentUser.school_id);
  }

  async getClassById(classId: string, currentUser: AuthenticatedUser): Promise<Class> {
    const classItem = await this.classRepository.findById(classId);
    if (!classItem) {
      throw new Error('Class not found');
    }

    // Check if user has access to this class's school
    if (currentUser.role !== 'admin' && currentUser.school_id !== classItem.school_id) {
      throw new Error('Access denied');
    }

    return classItem;
  }

  async createClass(data: CreateClassData, currentUser: AuthenticatedUser): Promise<Class> {
    // Ensure user can only create classes in their school
    if (currentUser.role !== 'admin' && currentUser.school_id !== data.school_id) {
      throw new Error('Access denied');
    }

    // TODO: Add validation with Zod schema
    const classId = await this.classRepository.create(data);
    
    const classItem = await this.classRepository.findById(classId);
    if (!classItem) {
      throw new Error('Failed to create class');
    }

    return classItem;
  }

  async updateClass(classId: string, data: UpdateClassData, currentUser: AuthenticatedUser): Promise<Class> {
    const existingClass = await this.classRepository.findById(classId);
    if (!existingClass) {
      throw new Error('Class not found');
    }

    // Check permissions
    if (currentUser.role !== 'admin' && currentUser.school_id !== existingClass.school_id) {
      throw new Error('Access denied');
    }

    // TODO: Add validation with Zod schema
    await this.classRepository.update(classId, data);
    
    const updatedClass = await this.classRepository.findById(classId);
    if (!updatedClass) {
      throw new Error('Failed to update class');
    }

    return updatedClass;
  }

  async getClassStudents(classId: string, currentUser: AuthenticatedUser) {
    // Check class access first
    await this.getClassById(classId, currentUser);
    return await this.classRepository.findStudentsByClassId(classId);
  }

  async getClassTeachers(classId: string, currentUser: AuthenticatedUser) {
    // Check class access first
    await this.getClassById(classId, currentUser);
    return await this.classRepository.findTeachersByClassId(classId);
  }
} 