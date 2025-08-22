import { v4 as uuidv4 } from 'uuid';
import { ClassUpdatesRepository } from '../repositories/classUpdatesRepository';
import { 
  ClassUpdateWithAuthor, 
  CreateClassUpdateRequest,
  ClassUpdatesResponse,
  ClassUpdateQueryParams 
} from '../types/classUpdate';
import { AuthenticatedRequest } from '../types/auth';

type AuthenticatedUser = AuthenticatedRequest['user'];
type CreateClassUpdateData = Omit<CreateClassUpdateRequest, 'class_id'>;

interface UserAccess {
  user_type: 'student' | 'teacher' | 'parent' | 'admin';
  role: 'user' | 'admin';
  school_id: string;
  role_in_class?: string;
}

export class ClassUpdatesService {
  constructor(private classUpdatesRepository: ClassUpdatesRepository) {}

  async getClassUpdates(
    classId: string,
    queryParams: ClassUpdateQueryParams & { page?: string; limit?: string },
    currentUser: AuthenticatedUser
  ): Promise<ClassUpdatesResponse> {
    const { page = '1', limit = '20', subject_offering_id, ...otherParams } = queryParams;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // Check user access
    await this.checkUserAccess(currentUser, classId);

    // Handle subject filtering if needed
    let authorIds: string[] | undefined;
    if (subject_offering_id) {
      authorIds = await this.classUpdatesRepository.getSubjectTeachers(subject_offering_id, classId);
    }

    // Get updates from repository
    const updates = await this.classUpdatesRepository.findByClassId(classId, {
      ...otherParams,
      page: parseInt(page),
      limit: parseInt(limit),
      offset,
      authorIds
    });

    return {
      updates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: updates.length,
        hasMore: updates.length === parseInt(limit)
      }
    };
  }

  async createClassUpdate(
    classId: string,
    data: CreateClassUpdateData,
    currentUser: AuthenticatedUser
  ): Promise<ClassUpdateWithAuthor> {
    // Check user permissions for creating updates
    await this.checkCreatePermissions(currentUser, classId);

    // Create the class update
    const updateId = uuidv4();
    await this.classUpdatesRepository.create({
      ...data,
      id: updateId,
      class_id: classId,
      author_id: currentUser.id,
      created_at: new Date(),
      updated_at: new Date()
    });

    // Get the created update with author information
    const createdUpdate = await this.classUpdatesRepository.findByIdWithAuthor(updateId);
    if (!createdUpdate) {
      throw new Error('Failed to retrieve created update');
    }

    return createdUpdate;
  }

  private async checkUserAccess(currentUser: AuthenticatedUser, classId: string): Promise<void> {
    const user = await this.classUpdatesRepository.getUserById(currentUser.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is an admin teacher - they can view updates for any class in their school
    if (user.role === 'admin' && user.user_type === 'teacher') {
      // Verify the class exists and belongs to their school
      const targetClass = await this.classUpdatesRepository.getClassByIdAndSchool(classId, user.school_id);
      if (!targetClass) {
        throw new Error('Class not found or access denied');
      }
    } else {
      // For non-admin users, check if they're enrolled in the specific class
      const userClass = await this.classUpdatesRepository.getUserClass(currentUser.id, classId);
      if (!userClass) {
        throw new Error('Access denied to this class');
      }
    }
  }

  private async checkCreatePermissions(currentUser: AuthenticatedUser, classId: string): Promise<void> {
    const user = await this.classUpdatesRepository.getUserById(currentUser.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check if user is an admin teacher - they can create updates for any class in their school
    if (user.role === 'admin' && user.user_type === 'teacher') {
      // Verify the class exists and belongs to their school
      const targetClass = await this.classUpdatesRepository.getClassByIdAndSchool(classId, user.school_id);
      if (!targetClass) {
        throw new Error('Class not found or access denied');
      }
    } else {
      // For non-admin users, check if they're enrolled in the specific class
      const userClass = await this.classUpdatesRepository.getUserClassWithDetails(currentUser.id, classId);
      if (!userClass) {
        throw new Error('Access denied to this class');
      }

      if (userClass.user_type !== 'teacher' && userClass.role_in_class !== 'teacher') {
        throw new Error('Only teachers can create class updates');
      }
    }
  }
}
