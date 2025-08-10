import { ClassRepository } from '../repositories/classRepository';
import { LessonRepository } from '../repositories/lessonRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import { AuthenticatedRequest } from '../types/auth';

type AuthenticatedUser = AuthenticatedRequest['user'];
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
    // Admins and regular users can see all classes in their school
    return await this.classRepository.findBySchoolId(currentUser.school_id);
  }

  async getUserClasses(currentUser: AuthenticatedUser): Promise<ClassWithDetails[]> {
    // Admins get all classes in their school, others get only enrolled classes
    if (currentUser.role === 'admin') {
      const allClasses = await this.classRepository.findBySchoolId(currentUser.school_id);
      
      // Get additional details for all classes
      const classesWithDetails = await Promise.all(
        allClasses.map(async (classItem) => {
          const [studentCount, teacherCount] = await Promise.all([
            this.userClassRepository.getClassStudentCount(classItem.id),
            this.userClassRepository.getClassTeacherCount(classItem.id)
          ]);

          return {
            id: classItem.id,
            school_id: classItem.school_id,
            name: classItem.name,
            description: classItem.description,
            grade_level: classItem.grade_level,
            section: classItem.section,
            academic_year: classItem.academic_year,
            settings: classItem.settings,
            is_active: classItem.is_active,
            created_at: classItem.created_at,
            updated_at: classItem.updated_at,
            student_count: studentCount,
            teacher_count: teacherCount
          } as ClassWithDetails;
        })
      );

      return classesWithDetails;
    }

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
    // Admins can access all classes in their school
    if (currentUser.role === 'admin') {
      const classItem = await this.classRepository.findById(classId);
      if (!classItem) {
        return false;
      }
      return classItem.school_id === currentUser.school_id;
    }

    // Regular users need to be enrolled in the class
    return await this.userClassRepository.checkUserClassAccess(currentUser.id, classId);
  }

  async createClass(data: CreateClassData, currentUser: AuthenticatedUser): Promise<Class> {
    // Ensure user can only create classes in their school
    if (currentUser.school_id !== data.school_id) {
      throw new Error('Access denied: Can only create classes in your school');
    }

    // Only admins and authorized teachers can create classes
    if (currentUser.role !== 'admin' && !(currentUser.user_type === 'teacher' && currentUser.role === 'user')) {
      throw new Error('Access denied: Insufficient permissions to create class');
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

    // Check school access first
    if (currentUser.school_id !== existingClass.school_id) {
      throw new Error('Access denied: Can only modify classes in your school');
    }

    // Check permissions - admins have full access, teachers need to be assigned to the class
    if (currentUser.role !== 'admin') {
      const hasAccess = await this.checkClassAccess(classId, currentUser);
      if (!hasAccess) {
        throw new Error('Access denied: Insufficient permissions to modify this class');
      }
    }

    // TODO: Add validation with Zod schema
    await this.classRepository.update(classId, data);
    
    const updatedClass = await this.classRepository.findById(classId);
    if (!updatedClass) {
      throw new Error('Failed to update class');
    }

    return updatedClass;
  }

  async getClassStudents(classId: string, currentUser: AuthenticatedUser, page: number = 1, limit: number = 20) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    
    // Get students with pagination
    const [students, totalCount] = await Promise.all([
      this.classRepository.findStudentsByClassId(classId, page, limit),
      this.userClassRepository.getClassStudentCount(classId)
    ]);

    return {
      students,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: (page * limit) < totalCount
      }
    };
  }

  async getClassTeachers(classId: string, currentUser: AuthenticatedUser, page: number = 1, limit: number = 20) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    
    // Get teachers with pagination
    const [teachers, totalCount] = await Promise.all([
      this.classRepository.findTeachersByClassId(classId, page, limit),
      this.userClassRepository.getClassTeacherCount(classId)
    ]);

    return {
      teachers,
      pagination: {
        page,
        limit,
        total: totalCount,
        hasMore: (page * limit) < totalCount
      }
    };
  }

  async getClassCounts(classId: string, currentUser: AuthenticatedUser) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    
    // Get counts in parallel
    const [studentCount, teacherCount] = await Promise.all([
      this.userClassRepository.getClassStudentCount(classId),
      this.userClassRepository.getClassTeacherCount(classId)
    ]);

    return {
      student_count: studentCount,
      teacher_count: teacherCount,
      total_members: studentCount + teacherCount
    };
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