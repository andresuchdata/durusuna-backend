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

interface Attachment {
  id: string;
  url: string;
  key?: string;
  [key: string]: any;
}

export class ClassUpdatesService {
  constructor(private classUpdatesRepository: ClassUpdatesRepository) {}

  /**
   * Fix attachment URLs that may be using private storage URLs
   * Converts private R2/S3 URLs to backend proxy URLs
   */
  private fixAttachmentUrls(attachments: Attachment[] | null | undefined): Attachment[] {
    if (!attachments || !Array.isArray(attachments)) return [];

    const backendUrl = process.env.BACKEND_PUBLIC_URL || 'http://localhost:3001';

    return attachments.map(attachment => {
      // If URL contains private storage endpoints, replace with backend proxy
      if (attachment.url && 
          (attachment.url.includes('cloudflarestorage.com') || 
           attachment.url.includes('.s3.amazonaws.com'))) {
        
        // Extract the key from the URL or use the stored key
        let key = attachment.key;
        if (!key && attachment.url.includes('cloudflarestorage.com')) {
          // Extract key from R2 URL: https://xxx.r2.cloudflarestorage.com/bucket-name/folder/year/month/file.ext
          const urlParts = attachment.url.split('/');
          const bucketIndex = urlParts.findIndex(part => part.includes('cloudflarestorage.com')) + 1;
          if (bucketIndex > 0) {
            // Skip bucket name, take folder/year/month/file
            key = urlParts.slice(bucketIndex + 1).join('/');
          }
        }

        if (key) {
          // Generate backend proxy URL
          return {
            ...attachment,
            url: `${backendUrl}/api/uploads/serve/${key}`
          };
        }
      }

      return attachment;
    });
  }

  async getClassUpdates(
    classId: string | undefined,
    queryParams: ClassUpdateQueryParams & { page?: string; limit?: string; search?: string },
    currentUser: AuthenticatedUser
  ): Promise<ClassUpdatesResponse> {
    const { page = '1', limit = '20', subject_offering_id, search, ...otherParams } = queryParams;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // If no classId provided, get updates from all user's classes
    if (!classId) {
      const updates = await this.classUpdatesRepository.findByUserId(currentUser.id, {
        ...otherParams,
        page: parseInt(page),
        limit: parseInt(limit),
        offset,
        search
      });

      // Fix attachment URLs for all updates
      const fixedUpdates = updates.map(update => ({
        ...update,
        attachments: this.fixAttachmentUrls(update.attachments as any) as any
      }));

      return {
        updates: fixedUpdates,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: fixedUpdates.length,
          hasMore: fixedUpdates.length === parseInt(limit)
        }
      };
    }

    // Check user access for specific class
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
      authorIds,
      search,
      currentUserId: currentUser.id
    });

    // Fix attachment URLs for all updates
    const fixedUpdates = updates.map(update => ({
      ...update,
      attachments: this.fixAttachmentUrls(update.attachments as any) as any
    }));

    return {
      updates: fixedUpdates,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: fixedUpdates.length,
        hasMore: fixedUpdates.length === parseInt(limit)
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

    // Fix attachment URLs before returning
    return {
      ...createdUpdate,
      attachments: this.fixAttachmentUrls(createdUpdate.attachments as any) as any
    };
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

    // Fix attachment URLs before returning
    return {
      ...updatedUpdate,
      attachments: this.fixAttachmentUrls(updatedUpdate.attachments as any) as any
    };
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
      hasAccess = !!userClass;
    }

    if (!hasAccess) {
      // Provide a more specific error message based on user type
      if (user.user_type === 'parent') {
        throw new Error('Only teachers can create class updates and upload attachments');
      }

      throw new Error('Access denied to this class. Only teachers can upload attachments.');
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
