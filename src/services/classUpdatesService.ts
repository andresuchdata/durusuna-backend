import { v4 as uuidv4 } from 'uuid';
import { ClassUpdatesRepository } from '../repositories/classUpdatesRepository';
import { 
  ClassUpdateWithAuthor, 
  CreateClassUpdateRequest,
  ClassUpdatesResponse,
  ClassUpdateQueryParams,
  ClassUpdateCommentWithAuthor,
  CreateCommentRequest,
  ClassUpdateResponse
} from '../types/classUpdate';
import { AuthenticatedRequest } from '../types/auth';
import { safeJsonParse, migrateReactions, safeJsonStringify } from '../utils/json';

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

  /**
   * Get class update by ID with author information and comments
   */
  async getClassUpdateWithComments(
    updateId: string,
    currentUser: AuthenticatedUser
  ): Promise<ClassUpdateResponse> {
    // Get the update with author information
    const update = await this.classUpdatesRepository.findByIdWithAuthor(updateId);
    
    if (!update) {
      throw new Error('Class update not found');
    }

    // Check if user has access to the class
    await this.checkUserAccess(currentUser, update.class_id);

    // Get comments for this update
    const comments = await this.classUpdatesRepository.getCommentsByUpdateId(updateId);

    return { update, comments };
  }

  /**
   * Get comments for a class update with pagination
   */
  async getClassUpdateComments(
    updateId: string,
    currentUser: AuthenticatedUser,
    page: number = 1,
    limit: number = 20
  ): Promise<{ comments: ClassUpdateCommentWithAuthor[]; pagination: any }> {
    // Get the update to check access
    const update = await this.classUpdatesRepository.getUpdateById(updateId);
    if (!update) {
      throw new Error('Class update not found');
    }

    // Check user access
    await this.checkUserAccess(currentUser, update.class_id);

    // Get comments with pagination
    const { comments, total } = await this.classUpdatesRepository.getCommentsByUpdateIdPaginated(
      updateId, 
      page, 
      limit
    );

    const pagination = {
      page,
      limit,
      total,
      hasMore: (page - 1) * limit + comments.length < total
    };

    return { comments, pagination };
  }

  /**
   * Create a comment on a class update
   */
  async createComment(
    updateId: string,
    currentUser: AuthenticatedUser,
    data: CreateCommentRequest
  ): Promise<{ comment: ClassUpdateCommentWithAuthor; classId: string }> {
    // Get the update to check access
    const update = await this.classUpdatesRepository.getUpdateById(updateId);
    if (!update) {
      throw new Error('Class update not found');
    }

    // Check if user has access to the class
    await this.checkUserAccess(currentUser, update.class_id);

    // Verify reply-to comment exists if provided
    if (data.reply_to_id) {
      const replyExists = await this.classUpdatesRepository.commentExists(data.reply_to_id, updateId);
      if (!replyExists) {
        throw new Error('Invalid reply-to comment');
      }
    }

    // Create the comment
    const comment = await this.classUpdatesRepository.createComment(updateId, currentUser.id, data);

    return { comment, classId: update.class_id };
  }

  /**
   * Toggle reaction on a class update
   */
  async toggleUpdateReaction(
    updateId: string,
    currentUser: AuthenticatedUser,
    emoji: string
  ): Promise<{ message: string; reactions: Record<string, any> }> {
    // Get the existing update
    const existingUpdate = await this.classUpdatesRepository.getUpdateById(updateId);
    if (!existingUpdate) {
      throw new Error('Class update not found');
    }

    // Check access
    await this.checkUserAccess(currentUser, existingUpdate.class_id);

    // Parse existing reactions
    const reactions = migrateReactions(safeJsonParse(existingUpdate.reactions, {}));
    
    // Initialize emoji reaction if it doesn't exist
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: [] };
    }

    // Check if user has already reacted with this emoji
    const userIndex = reactions[emoji].users.indexOf(currentUser.id);
    
    if (userIndex > -1) {
      // User has already reacted, remove the reaction
      reactions[emoji].users.splice(userIndex, 1);
      reactions[emoji].count = reactions[emoji].users.length;
      
      // Remove emoji entirely if no reactions left
      if (reactions[emoji].users.length === 0) {
        delete reactions[emoji];
      }
    } else {
      // User hasn't reacted, add the reaction
      reactions[emoji].users.push(currentUser.id);
      reactions[emoji].count = reactions[emoji].users.length;
    }

    // Update the class update with new reactions
    await this.classUpdatesRepository.updateReactions(updateId, reactions);

    return {
      message: userIndex > -1 ? 'Reaction removed successfully' : 'Reaction added successfully',
      reactions
    };
  }

  /**
   * Toggle reaction on a comment
   */
  async toggleCommentReaction(
    commentId: string,
    currentUser: AuthenticatedUser,
    emoji: string
  ): Promise<{ message: string; reactions: Record<string, any> }> {
    // Get the existing comment with update info
    const existingComment = await this.classUpdatesRepository.getCommentWithClassInfo(commentId);
    if (!existingComment) {
      throw new Error('Comment not found');
    }

    // Check access
    await this.checkUserAccess(currentUser, existingComment.class_id);

    // Parse existing reactions
    const reactions = migrateReactions(safeJsonParse(existingComment.reactions, {}));
    
    // Initialize emoji reaction if it doesn't exist
    if (!reactions[emoji]) {
      reactions[emoji] = { count: 0, users: [] };
    }

    // Check if user has already reacted with this emoji
    const userIndex = reactions[emoji].users.indexOf(currentUser.id);
    
    if (userIndex > -1) {
      // User has already reacted, remove the reaction
      reactions[emoji].users.splice(userIndex, 1);
      reactions[emoji].count = reactions[emoji].users.length;
      
      // Remove emoji entirely if no reactions left
      if (reactions[emoji].users.length === 0) {
        delete reactions[emoji];
      }
    } else {
      // User hasn't reacted, add the reaction
      reactions[emoji].users.push(currentUser.id);
      reactions[emoji].count = reactions[emoji].users.length;
    }

    // Update the comment with new reactions
    await this.classUpdatesRepository.updateCommentReactions(commentId, reactions);

    return {
      message: userIndex > -1 ? 'Reaction removed successfully' : 'Reaction added successfully',
      reactions
    };
  }

  /**
   * Update class update
   */
  async updateClassUpdate(
    updateId: string,
    currentUser: AuthenticatedUser,
    updateData: any
  ): Promise<ClassUpdateWithAuthor> {
    // Get the existing update
    const existingUpdate = await this.classUpdatesRepository.getUpdateById(updateId);
    if (!existingUpdate) {
      throw new Error('Class update not found');
    }

    // Check if user is the author or has permission
    if (existingUpdate.author_id !== currentUser.id) {
      // Check if user is an admin teacher
      const currentUserDetails = await this.classUpdatesRepository.getUserById(currentUser.id);
      if (!(currentUserDetails?.role === 'admin' && currentUserDetails?.user_type === 'teacher')) {
        throw new Error('Access denied. Only the author or admin can update this.');
      }

      // Verify class belongs to admin's school
      const targetClass = await this.classUpdatesRepository.getClassByIdAndSchool(
        existingUpdate.class_id, 
        currentUserDetails.school_id
      );
      if (!targetClass) {
        throw new Error('Access denied to this class');
      }
    }

    // Update the class update
    const updatedUpdate = await this.classUpdatesRepository.updateById(updateId, updateData);
    if (!updatedUpdate) {
      throw new Error('Failed to update class update');
    }

    return updatedUpdate;
  }

  /**
   * Delete class update
   */
  async deleteClassUpdate(updateId: string, currentUser: AuthenticatedUser): Promise<void> {
    // Get the existing update
    const existingUpdate = await this.classUpdatesRepository.getUpdateById(updateId);
    if (!existingUpdate) {
      throw new Error('Class update not found');
    }

    // Check if user is the author or has permission
    if (existingUpdate.author_id !== currentUser.id) {
      // Check if user is an admin teacher
      const currentUserDetails = await this.classUpdatesRepository.getUserById(currentUser.id);
      if (!(currentUserDetails?.role === 'admin' && currentUserDetails?.user_type === 'teacher')) {
        throw new Error('Access denied. Only the author or admin can delete this.');
      }

      // Verify class belongs to admin's school
      const targetClass = await this.classUpdatesRepository.getClassByIdAndSchool(
        existingUpdate.class_id, 
        currentUserDetails.school_id
      );
      if (!targetClass) {
        throw new Error('Access denied to this class');
      }
    }

    // Soft delete the class update
    await this.classUpdatesRepository.softDelete(updateId);
  }

  /**
   * Update pin status
   */
  async updatePinStatus(updateId: string, currentUser: AuthenticatedUser, isPinned: boolean): Promise<void> {
    // Get the update
    const update = await this.classUpdatesRepository.getUpdateById(updateId);
    if (!update) {
      throw new Error('Class update not found');
    }

    // Check if user is a teacher and has access to this class
    const currentUserDetails = await this.classUpdatesRepository.getUserById(currentUser.id);
    if (currentUserDetails?.user_type !== 'teacher') {
      throw new Error('Only teachers can pin/unpin updates');
    }

    // Check class access
    await this.checkUserAccess(currentUser, update.class_id);

    // Update pin status
    await this.classUpdatesRepository.updatePinStatus(updateId, isPinned);
  }

  /**
   * Validate file upload permissions
   */
  async validateUploadPermissions(currentUser: AuthenticatedUser, classId: string): Promise<UserAccess> {
    const user = await this.classUpdatesRepository.getUserById(currentUser.id);
    if (!user) {
      throw new Error('User not found');
    }

    // Check access permissions
    let hasAccess = false;
    if (user.role === 'admin' && user.user_type === 'teacher') {
      const targetClass = await this.classUpdatesRepository.getClassByIdAndSchool(classId, user.school_id);
      hasAccess = !!targetClass;
    } else {
      const userClass = await this.classUpdatesRepository.getUserClassWithDetails(currentUser.id, classId);
      hasAccess = userClass && (userClass.user_type === 'teacher' || userClass.role_in_class === 'teacher');
    }

    if (!hasAccess) {
      throw new Error('Access denied to this class');
    }

    return user;
  }

  /**
   * Check if user can delete attachments (teachers only)
   */
  async validateDeleteAttachmentPermissions(currentUser: AuthenticatedUser): Promise<void> {
    const user = await this.classUpdatesRepository.getUserById(currentUser.id);
    if (!user || (user.user_type !== 'teacher' && user.role !== 'admin')) {
      throw new Error('Only teachers can delete attachments');
    }
  }
}
