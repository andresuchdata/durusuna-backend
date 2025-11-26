import { ClassRepository } from '../repositories/classRepository';
import { LessonRepository } from '../repositories/lessonRepository';
import { UserClassRepository } from '../repositories/userClassRepository';
import { EnrollmentRepository } from '../repositories/enrollmentRepository';
import { UserService } from './userService';
import { AuthenticatedRequest } from '../types/auth';
import knex from '../shared/database/connection';

type AuthenticatedUser = AuthenticatedRequest['user'];
import {
  Class,
  CreateClassRequest as CreateClassData,
  UpdateClassRequest as UpdateClassData,
  ClassWithDetails
} from '../types/class';

export class ClassService {
  private lessonRepository: LessonRepository;
  private userClassRepository: UserClassRepository;
  private enrollmentRepository: EnrollmentRepository;
  private userService: UserService;

  constructor(
    private classRepository: ClassRepository,
    lessonRepository: LessonRepository,
    userClassRepository: UserClassRepository,
    enrollmentRepository: EnrollmentRepository,
    userService: UserService
  ) {
    this.lessonRepository = lessonRepository;
    this.userClassRepository = userClassRepository;
    this.enrollmentRepository = enrollmentRepository;
    this.userService = userService;
  }

  async getAllClasses(currentUser: AuthenticatedUser): Promise<Class[]> {
    // Admins can see all classes in their school
    if (currentUser.role === 'admin') {
      if (!currentUser.school_id) {
        throw new Error('Admin must be associated with a school');
      }
      return await this.classRepository.findBySchoolId(currentUser.school_id);
    }

    // Teachers and students can see classes they're directly assigned to
    if (currentUser.user_type === 'teacher' || currentUser.user_type === 'student') {
      const userClasses = await this.userClassRepository.findUserClassesByUserId(currentUser.id);
      const classMap = new Map<string, Class>();

      userClasses.forEach((userClass) => {
        if (userClass.class && userClass.class.is_active) {
          classMap.set(userClass.class.id, userClass.class as Class);
        }
      });

      return Array.from(classMap.values());
    }

    // Parents can see classes for their active children assignments
    if (currentUser.user_type === 'parent') {
      const parentClasses = await this.userClassRepository.findParentClasses(currentUser.id);
      return parentClasses;
    }

    // Default to no classes for unsupported user types
    return [];
  }

  async getUserClasses(currentUser: AuthenticatedUser): Promise<ClassWithDetails[]> {
    // Admins get all classes in their school, others get only enrolled classes
    if (currentUser.role === 'admin') {
      if (!currentUser.school_id) {
        throw new Error('Admin must be associated with a school');
      }
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
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    return await this.lessonRepository.findLessonInstancesByClassId(classId);
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

    if (currentUser.user_type === 'parent') {
      return await this.userClassRepository.checkParentClassAccess(currentUser.id, classId);
    }

    // Regular users (students/teachers) need to be enrolled in the class
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

    // If a teacher created the class, automatically assign them as a teacher
    if (currentUser.user_type === 'teacher' && currentUser.role === 'user') {
      await this.userClassRepository.addUserToClass(currentUser.id, classId, 'teacher');
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

  async getClassStudents(classId: string, currentUser: AuthenticatedUser, page: number = 1, limit: number = 20, search?: string) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }
    
    // Get students with pagination and search
    const [students, totalCount] = await Promise.all([
      this.classRepository.findStudentsByClassId(classId, page, limit, search),
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

  async checkStudentsEnrollment(classId: string, currentUser: AuthenticatedUser, studentIds: string[]) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // For parents, verify they can only check their own children
    if (currentUser.user_type === 'parent') {
      // Get parent's children to validate the requested student IDs
      const parentChildren = await this.userService.getParentChildren(currentUser);
      const parentChildIds = new Set(parentChildren.map((child: { id: string }) => child.id));
      
      // Filter to only include children of this parent
      const validStudentIds = studentIds.filter(id => parentChildIds.has(id));
      if (validStudentIds.length === 0) {
        return { enrolled_students: [] };
      }
      
      studentIds = validStudentIds;
    }

    // Check enrollment for the specified students
    const enrolledStudents = await this.userClassRepository.checkStudentsEnrollment(classId, studentIds);
    
    return { enrolled_students: enrolledStudents };
  }

  async addStudentsToClass(classId: string, studentIds: string[], currentUser: AuthenticatedUser) {
    if (!studentIds || studentIds.length === 0) {
      throw new Error('Student IDs array is required');
    }

    const classItem = await this.classRepository.findById(classId);
    if (!classItem) {
      throw new Error('Class not found');
    }

    // Only admins and teachers can add students
    if (currentUser.role !== 'admin' && currentUser.user_type !== 'teacher') {
      throw new Error('Access denied');
    }

    // Admins must belong to the same school
    if (currentUser.role === 'admin') {
      if (!currentUser.school_id || currentUser.school_id !== classItem.school_id) {
        throw new Error('Access denied');
      }
    } else {
      const hasAccess = await this.checkClassAccess(classId, currentUser);
      if (!hasAccess) {
        throw new Error('Access denied');
      }
    }

    const uniqueStudentIds = Array.from(new Set(studentIds));
    const added: string[] = [];
    const alreadyEnrolled: string[] = [];
    const invalid: string[] = [];

    for (const studentId of uniqueStudentIds) {
      const student = await this.userClassRepository.getUserById(studentId);

      if (!student || student.user_type !== 'student' || student.school_id !== classItem.school_id) {
        invalid.push(studentId);
        continue;
      }

      const existing = await this.userClassRepository.getUserClass(studentId, classId);
      if (existing) {
        alreadyEnrolled.push(studentId);
        continue;
      }

      await this.userClassRepository.addUserToClass(studentId, classId, 'student');
      added.push(studentId);
    }

    return {
      added,
      already_enrolled: alreadyEnrolled,
      invalid
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

    // Admins can see all subjects
    if (currentUser.role === 'admin') {
      const classSubjects = await this.classRepository.findClassSubjectsWithDetails(classId);
      return await this.mapSubjectsWithLessons(classSubjects);
    }

    // Teachers see only subjects they teach
    if (currentUser.user_type === 'teacher') {
      const classSubjects = await this.classRepository.findClassSubjectsWithDetails(classId, currentUser.id);
      return await this.mapSubjectsWithLessons(classSubjects);
    }

    // Students see subjects where they have active enrollments
    if (currentUser.user_type === 'student') {
      const enrollments = await this.enrollmentRepository.getStudentEnrollments(currentUser.id);
      return this.mapSubjectsFromEnrollments(enrollments, classId);
    }

    // Parents see subjects tied to their children
    if (currentUser.user_type === 'parent') {
      const enrollments = await this.enrollmentRepository.getChildrenEnrollments(currentUser.id);
      return this.mapSubjectsFromEnrollments(enrollments, classId);
    }

    return [];
  }

  async addSubjectsToClass(classId: string, subjectIds: string[], currentUser: AuthenticatedUser) {
    // Check class access first - only teachers and admins can add subjects
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // Only teachers and admins can add subjects
    if (currentUser.user_type !== 'teacher' && currentUser.role !== 'admin') {
      throw new Error('Access denied');
    }

    const added: string[] = [];
    const alreadyAdded: string[] = [];
    const invalid: string[] = [];

    // Check which subjects exist and which are already added to the class
    const existingSubjects = await knex('subjects')
      .select('id', 'name')
      .whereIn('id', subjectIds);

    const existingSubjectIds = existingSubjects.map(s => s.id);
    const invalidSubjectIds = subjectIds.filter(id => !existingSubjectIds.includes(id));

    if (invalidSubjectIds.length > 0) {
      invalid.push(...invalidSubjectIds);
    }

    // Check which subjects are already added to this class
    const existingClassSubjects = await knex('class_subjects')
      .select('subject_id')
      .where('class_id', classId)
      .whereIn('subject_id', existingSubjectIds);

    const existingClassSubjectIds = existingClassSubjects.map(cs => cs.subject_id);
    const newSubjectIds = existingSubjectIds.filter(id => !existingClassSubjectIds.includes(id));

    // Add new subjects to the class
    if (newSubjectIds.length > 0) {
      const classSubjectsToAdd = newSubjectIds.map(subjectId => ({
        class_id: classId,
        subject_id: subjectId,
        teacher_id: currentUser.user_type === 'teacher' ? currentUser.id : null,
        hours_per_week: 4, // Default value
        is_active: true
      }));

      await knex('class_subjects').insert(classSubjectsToAdd);
      added.push(...newSubjectIds);
    }

    // Track already added subjects
    alreadyAdded.push(...existingClassSubjectIds);

    return {
      added,
      already_added: alreadyAdded,
      invalid
    };
  }

  async getClassOfferings(classId: string, currentUser: AuthenticatedUser, academicPeriodId?: string) {
    // Check class access first
    const hasAccess = await this.checkClassAccess(classId, currentUser);
    if (!hasAccess) {
      throw new Error('Access denied');
    }

    // For teachers, filter offerings to show only the ones they teach unless admin
    let teacherFilterId: string | undefined;
    if (currentUser.user_type === 'teacher' && currentUser.role !== 'admin') {
      teacherFilterId = currentUser.id;
    }

    // Get class offerings with their details, filtered by teacher and academic period if applicable
    const offerings = await this.classRepository.findClassOfferingsWithDetails(
      classId,
      teacherFilterId,
      academicPeriodId
    );

    return offerings;
  }

  private async mapSubjectsWithLessons(classSubjects: any[]) {
    return await Promise.all(classSubjects.map(async (cs) => {
      const lessons = await this.lessonRepository.findLessonInstancesByClassSubjectId(cs.class_subject_id);

      return {
        class_subject_id: cs.class_subject_id,
        subject_id: cs.subject_id,
        subject_name: cs.subject_name,
        subject_code: cs.subject_code,
        subject_description: cs.subject_description,
        hours_per_week: cs.hours_per_week,
        classroom: cs.classroom,
        schedule: cs.schedule,
        teacher: cs.teacher_id ? {
          id: cs.teacher_id,
          first_name: cs.first_name,
          last_name: cs.last_name,
          email: cs.email,
          avatar_url: cs.avatar_url
        } : null,
        lessons
      };
    }));
  }

  private mapSubjectsFromEnrollments(enrollments: any[], classId: string) {
    const subjectsMap = new Map<string, any>();

    enrollments
      .filter((enrollment) => enrollment.class_id === classId)
      .forEach((enrollment) => {
        if (!subjectsMap.has(enrollment.subject_id)) {
          subjectsMap.set(enrollment.subject_id, {
            subject_id: enrollment.subject_id,
            subject_name: enrollment.subject_name,
            subject_code: enrollment.subject_code,
            subject_description: enrollment.subject_description,
            hours_per_week: enrollment.hours_per_week,
            classroom: enrollment.room,
            schedule: enrollment.schedule,
            teacher: enrollment.primary_teacher_id ? {
              id: enrollment.primary_teacher_id,
              first_name: enrollment.teacher_first_name,
              last_name: enrollment.teacher_last_name,
              email: enrollment.teacher_email,
              avatar_url: enrollment.teacher_avatar_url
            } : null,
            lessons: []
          });
        }
      });

    return Array.from(subjectsMap.values());
  }
} 