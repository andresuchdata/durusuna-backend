import { ClassRepository } from '../repositories/classRepository';
import { LessonRepository } from '../repositories/lessonRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import { AuthenticatedUser } from '../types/user';
import {
  Class,
  CreateClassRequest as CreateClassData,
  UpdateClassRequest as UpdateClassData,
  ClassWithDetails,
  UserClassWithUser
} from '../types/class';

export class ClassService {
  private lessonRepository: LessonRepository;
  private userClassRepository: UserClassRepository;

  constructor(
    private classRepository: ClassRepository,
    lessonRepository: LessonRepository,
    userClassRepository: UserClassRepository
  ) {
    this.lessonRepository = lessonRepository;
    this.userClassRepository = userClassRepository;
  }

  async getAllClasses(currentUser: AuthenticatedUser): Promise<Class[]> {
    // Users can only see classes in their school
    return await this.classRepository.findBySchoolId(currentUser.school_id);
  }

  async getUserClasses(currentUser: AuthenticatedUser): Promise<ClassWithDetails[]> {
    // Get classes where user is enrolled (either as student or teacher)
    const userClasses = await this.userClassRepository.findUserClassesByUserId(currentUser.id);

    // For each class, get additional details
    const classesWithDetails = await Promise.all(
      userClasses.map(async (userClass) => {
        const [studentCount, teacherCount] = await Promise.all([
          this.userClassRepository.getClassStudentCount(userClass.class_id),
          this.userClassRepository.getClassTeacherCount(userClass.class_id)
        ]);

        return {
          id: userClass.class_id,
          school_id: userClass.class.school_id,
          name: userClass.class.name,
          description: userClass.class.description,
          grade_level: userClass.class.grade_level,
          section: userClass.class.section,
          academic_year: userClass.class.academic_year,
          settings: userClass.class.settings,
          is_active: userClass.class.is_active,
          created_at: userClass.class.created_at,
          updated_at: userClass.class.updated_at,
          student_count: studentCount,
          teacher_count: teacherCount
        } as ClassWithDetails;
      })
    );

    return classesWithDetails;
  }

  async getClassById(classId: string, currentUser: AuthenticatedUser): Promise<ClassWithDetails> {
    const classItem = await this.classRepository.findById(classId);
    if (!classItem) {
      throw new Error('Class not found');
    }

    // Check if user has access to this class
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get additional details
    const [students, teachers, studentCount, teacherCount] = await Promise.all([
      this.classRepository.findStudentsByClassId(classId),
      this.classRepository.findTeachersByClassId(classId),
      this.userClassRepository.getClassStudentCount(classId),
      this.userClassRepository.getClassTeacherCount(classId)
    ]);

    return {
      ...classItem,
      students,
      teachers,
      student_count: studentCount,
      teacher_count: teacherCount
    } as ClassWithDetails;
  }

  async getClassLessons(classId: string, currentUser: AuthenticatedUser) {
    // Check access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await this.lessonRepository.findByClassId(classId);
  }

  async checkClassAccess(classId: string, currentUser: AuthenticatedUser): Promise<boolean> {
    // Get user details from repository
    const userDetails = await this.userClassRepository.getUserType(currentUser.id);
    if (!userDetails) {
      return false;
    }

    // Admin teachers can access all classes in their school
    if (userDetails.role === 'admin' && userDetails.user_type === 'teacher') {
      const classItem = await this.classRepository.findById(classId);
      if (!classItem) {
        return false;
      }
      return classItem.school_id === userDetails.school_id;
    }

    // Regular users need to be enrolled in the class
    return await this.userClassRepository.checkUserClassAccess(currentUser.id, classId);
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
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    return await this.classRepository.findStudentsByClassId(classId);
  }

  async getClassTeachers(classId: string, currentUser: AuthenticatedUser) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    return await this.classRepository.findTeachersByClassId(classId);
  }

  async getClassSubjects(classId: string, currentUser: AuthenticatedUser) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Get class subjects with their details
    const classSubjects = await this.classRepository.findClassSubjectsWithDetails(classId);

    // Get lessons for each subject
    const subjects = [];
    for (const cs of classSubjects) {
      const lessons = await this.lessonRepository.findByClassSubjectId(cs.class_subject_id);
      
      subjects.push({
        subject_id: cs.subject_id,
        subject_name: cs.subject_name,
        subject_code: cs.subject_code,
        subject_description: cs.subject_description,
        hours_per_week: cs.hours_per_week,
        classroom: cs.classroom,
        schedule: cs.schedule,
        teacher: {
          id: cs.teacher_id,
          first_name: cs.first_name,
          last_name: cs.last_name,
          email: cs.email,
          avatar_url: cs.avatar_url
        },
        lessons: lessons
      });
    }

    return subjects;
  }
} 