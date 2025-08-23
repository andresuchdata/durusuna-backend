import { Knex } from 'knex';
import { v4 as uuidv4 } from 'uuid';
import { 
  ClassUpdate, 
  ClassUpdateWithAuthor, 
  CreateClassUpdateRequest,
  ClassUpdateQueryParams,
  ClassUpdateCommentWithAuthor,
  CreateCommentRequest
} from '../types/classUpdate';
import { safeJsonParse, migrateReactions, safeJsonStringify } from '../utils/json';

export class ClassUpdatesRepository {
  constructor(private db: Knex) {}

  async findByClassId(
    classId: string, 
    options: ClassUpdateQueryParams & { 
      page: number; 
      limit: number; 
      offset: number;
      authorIds?: string[];
    }
  ): Promise<ClassUpdateWithAuthor[]> {
    const { 
      page, 
      limit, 
      offset, 
      type, 
      exclude_pinned, 
      authorIds 
    } = options;

    // Build query for class updates
    let query = this.db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.class_id', classId)
      .where('class_updates.is_deleted', false)
      .select(
        'class_updates.*',
        'users.id as author_user_id',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.phone as author_phone',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type',
        'users.role as author_role',
        'users.school_id as author_school_id',
        'users.is_active as author_is_active',
        'users.last_login_at as author_last_active_at',
        'users.created_at as author_created_at',
        'users.updated_at as author_updated_at'
      );

    // Filter by type if specified
    if (type) {
      query = query.where('class_updates.update_type', type);
    }

    // Exclude pinned items if specified (for recent updates)
    if (exclude_pinned === 'true') {
      query = query.where('class_updates.is_pinned', false);
    }

    // Filter by author IDs if provided (for subject filtering)
    if (authorIds && authorIds.length > 0) {
      query = query.whereIn('class_updates.author_id', authorIds);
    } else if (authorIds && authorIds.length === 0) {
      // If empty array provided, return no results
      query = query.where('class_updates.id', 'non-existent-id');
    }

    const updates = await query
      .orderBy([
        { column: 'class_updates.is_pinned', order: 'desc' },
        { column: 'class_updates.updated_at', order: 'desc' },
        { column: 'class_updates.created_at', order: 'desc' }
      ])
      .limit(limit)
      .offset(offset);

    // Get comments count for each update
    const updateIds = updates.map(update => update.id);
    let commentCounts: Array<{ class_update_id: string; count: string }> = [];
    
    if (updateIds.length > 0) {
      commentCounts = await this.db('class_update_comments')
        .whereIn('class_update_id', updateIds)
        .where('is_deleted', false)
        .groupBy('class_update_id')
        .select('class_update_id')
        .count('* as count');
    }

    // Create a map for quick lookup of comment counts
    const commentCountMap: Record<string, number> = {};
    commentCounts.forEach(item => {
      commentCountMap[item.class_update_id] = parseInt(item.count);
    });

    // Format response with comment counts
    return updates.map(update => {
      const attachments = safeJsonParse(update.attachments, []);
      
      return {
        id: update.id,
        class_id: update.class_id,
        author_id: update.author_id,
        title: update.title,
        content: update.content,
        update_type: update.update_type,
        is_pinned: update.is_pinned,
        is_deleted: update.is_deleted,
        attachments: attachments,
        reactions: migrateReactions(safeJsonParse(update.reactions, {})),
        comment_count: commentCountMap[update.id] || 0,
        created_at: update.created_at,
        updated_at: update.updated_at,
        author: {
          id: update.author_user_id,
          first_name: update.author_first_name,
          last_name: update.author_last_name,
          email: update.author_email,
          avatar_url: update.author_avatar || "",
          user_type: update.author_user_type,
          role: update.author_role
        }
      };
    });
  }

  async create(data: CreateClassUpdateRequest & { 
    id: string; 
    author_id: string; 
    created_at: Date; 
    updated_at: Date; 
  }): Promise<any> {
    const [newUpdate] = await this.db('class_updates')
      .insert({
        id: data.id,
        class_id: data.class_id,
        author_id: data.author_id,
        title: data.title,
        content: data.content,
        update_type: data.update_type,
        attachments: safeJsonStringify(data.attachments || []),
        reactions: safeJsonStringify({}),
        is_pinned: data.is_pinned || false,
        is_deleted: false,
        created_at: data.created_at,
        updated_at: data.updated_at
      })
      .returning('*');

    return newUpdate;
  }

  async findByIdWithAuthor(updateId: string): Promise<ClassUpdateWithAuthor | null> {
    const update = await this.db('class_updates')
      .join('users', 'class_updates.author_id', 'users.id')
      .where('class_updates.id', updateId)
      .select(
        'class_updates.*',
        'users.id as author_user_id',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type',
        'users.role as author_role'
      )
      .first();

    if (!update) return null;

    return {
      id: update.id,
      class_id: update.class_id,
      author_id: update.author_id,
      title: update.title,
      content: update.content,
      update_type: update.update_type,
      is_pinned: update.is_pinned,
      is_deleted: update.is_deleted,
      attachments: safeJsonParse(update.attachments, []),
      reactions: migrateReactions(safeJsonParse(update.reactions, {})),
      comment_count: 0,
      created_at: update.created_at,
      updated_at: update.updated_at,
      author: {
        id: update.author_user_id,
        first_name: update.author_first_name,
        last_name: update.author_last_name,
        email: update.author_email,
        avatar_url: update.author_avatar || "",
        user_type: update.author_user_type,
        role: update.author_role
      }
    };
  }

  async getSubjectTeachers(subjectOfferingId: string, classId: string): Promise<string[]> {
    // Get all teachers for this class offering
    const teachers = await this.db('class_offering_teachers')
      .join('class_offerings', 'class_offering_teachers.class_offering_id', 'class_offerings.id')
      .where('class_offerings.id', subjectOfferingId)
      .where('class_offerings.class_id', classId)
      .where('class_offering_teachers.is_active', true)
      .select('class_offering_teachers.teacher_id');
    
    // Also get the primary teacher from class_offerings table
    const primaryTeacher = await this.db('class_offerings')
      .where('id', subjectOfferingId)
      .where('class_id', classId)
      .whereNotNull('primary_teacher_id')
      .select('primary_teacher_id as teacher_id')
      .first();
    
    // Combine both lists and remove duplicates
    const allTeachers = teachers.map(t => t.teacher_id);
    if (primaryTeacher && primaryTeacher.teacher_id) {
      allTeachers.push(primaryTeacher.teacher_id);
    }
    
    // Return unique teacher IDs
    return [...new Set(allTeachers)];
  }

  async getUserById(userId: string): Promise<any> {
    return await this.db('users')
      .where('id', userId)
      .select('user_type', 'role', 'school_id')
      .first();
  }

  async getUserClass(userId: string, classId: string): Promise<any> {
    return await this.db('user_classes')
      .where({
        user_id: userId,
        class_id: classId
      })
      .first();
  }

  async getUserClassWithDetails(userId: string, classId: string): Promise<any> {
    return await this.db('user_classes')
      .join('users', 'user_classes.user_id', 'users.id')
      .where({
        'user_classes.user_id': userId,
        'user_classes.class_id': classId
      })
      .select('users.user_type', 'user_classes.role_in_class')
      .first();
  }

  async getClassByIdAndSchool(classId: string, schoolId: string): Promise<any> {
    return await this.db('classes')
      .where('id', classId)
      .where('school_id', schoolId)
      .first();
  }

  // Additional methods for service layer support

  async getUpdateById(updateId: string): Promise<any> {
    return await this.db('class_updates')
      .where('id', updateId)
      .where('is_deleted', false)
      .first();
  }

  async getCommentsByUpdateId(updateId: string): Promise<ClassUpdateCommentWithAuthor[]> {
    const comments = await this.db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.class_update_id', updateId)
      .where('class_update_comments.is_deleted', false)
      .select(
        'class_update_comments.*',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type'
      )
      .orderBy('class_update_comments.created_at', 'asc');

    return comments.map(comment => ({
      id: comment.id,
      class_update_id: comment.class_update_id,
      author_id: comment.author_id,
      content: comment.content,
      reply_to_id: comment.reply_to_id,
      reactions: safeJsonParse(comment.reactions, {}),
      is_edited: comment.is_edited || false,
      edited_at: comment.edited_at,
      is_deleted: comment.is_deleted,
      deleted_at: comment.deleted_at,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: {
        id: comment.author_id,
        first_name: comment.author_first_name,
        last_name: comment.author_last_name,
        email: comment.author_email,
        avatar_url: comment.author_avatar || "",
        user_type: comment.author_user_type
      }
    }));
  }

  async getCommentsByUpdateIdPaginated(updateId: string, page: number, limit: number): Promise<{ comments: ClassUpdateCommentWithAuthor[]; total: number }> {
    const offset = (page - 1) * limit;

    const comments = await this.db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.class_update_id', updateId)
      .where('class_update_comments.is_deleted', false)
      .select(
        'class_update_comments.*',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type'
      )
      .orderByRaw(`
        CASE WHEN class_update_comments.reply_to_id IS NULL THEN class_update_comments.created_at END DESC,
        COALESCE(class_update_comments.reply_to_id, class_update_comments.id),
        class_update_comments.created_at ASC
      `)
      .limit(limit)
      .offset(offset);

    const totalResult = await this.db('class_update_comments')
      .where('class_update_id', updateId)
      .where('is_deleted', false)
      .count('* as count')
      .first();

    const total = parseInt(totalResult?.count as string) || 0;

    const formattedComments = comments.map(comment => ({
      id: comment.id,
      class_update_id: comment.class_update_id,
      author_id: comment.author_id,
      content: comment.content,
      reply_to_id: comment.reply_to_id,
      reactions: safeJsonParse(comment.reactions, {}),
      is_edited: comment.is_edited || false,
      edited_at: comment.edited_at,
      is_deleted: comment.is_deleted,
      deleted_at: comment.deleted_at,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      author: {
        id: comment.author_id,
        first_name: comment.author_first_name,
        last_name: comment.author_last_name,
        email: comment.author_email,
        avatar_url: comment.author_avatar || "",
        user_type: comment.author_user_type
      }
    }));

    return { comments: formattedComments, total };
  }

  async commentExists(commentId: string, updateId: string): Promise<boolean> {
    const comment = await this.db('class_update_comments')
      .where('id', commentId)
      .where('class_update_id', updateId)
      .where('is_deleted', false)
      .first();
    return !!comment;
  }

  async createComment(updateId: string, authorId: string, data: CreateCommentRequest): Promise<ClassUpdateCommentWithAuthor> {
    const commentId = uuidv4();
    
    await this.db('class_update_comments').insert({
      id: commentId,
      class_update_id: updateId,
      author_id: authorId,
      content: data.content,
      reply_to_id: data.reply_to_id,
      is_deleted: false,
      created_at: new Date(),
      updated_at: new Date()
    });

    const commentWithAuthor = await this.db('class_update_comments')
      .join('users', 'class_update_comments.author_id', 'users.id')
      .where('class_update_comments.id', commentId)
      .select(
        'class_update_comments.*',
        'users.first_name as author_first_name',
        'users.last_name as author_last_name',
        'users.email as author_email',
        'users.avatar_url as author_avatar',
        'users.user_type as author_user_type'
      )
      .first();

    return {
      id: commentWithAuthor.id,
      class_update_id: commentWithAuthor.class_update_id,
      author_id: commentWithAuthor.author_id,
      content: commentWithAuthor.content,
      reply_to_id: commentWithAuthor.reply_to_id,
      reactions: safeJsonParse(commentWithAuthor.reactions, {}),
      is_edited: commentWithAuthor.is_edited || false,
      edited_at: commentWithAuthor.edited_at,
      is_deleted: commentWithAuthor.is_deleted,
      deleted_at: commentWithAuthor.deleted_at,
      created_at: commentWithAuthor.created_at,
      updated_at: commentWithAuthor.updated_at,
      author: {
        id: commentWithAuthor.author_id,
        first_name: commentWithAuthor.author_first_name,
        last_name: commentWithAuthor.author_last_name,
        email: commentWithAuthor.author_email,
        avatar_url: commentWithAuthor.author_avatar || "",
        user_type: commentWithAuthor.author_user_type
      }
    };
  }

  async updateReactions(updateId: string, reactions: Record<string, any>): Promise<void> {
    await this.db('class_updates')
      .where('id', updateId)
      .update({
        reactions: safeJsonStringify(reactions),
        updated_at: new Date()
      });
  }

  async getCommentWithClassInfo(commentId: string): Promise<any> {
    return await this.db('class_update_comments')
      .join('class_updates', 'class_update_comments.class_update_id', 'class_updates.id')
      .where('class_update_comments.id', commentId)
      .where('class_update_comments.is_deleted', false)
      .where('class_updates.is_deleted', false)
      .select(
        'class_update_comments.*',
        'class_updates.class_id'
      )
      .first();
  }

  async updateCommentReactions(commentId: string, reactions: Record<string, any>): Promise<void> {
    await this.db('class_update_comments')
      .where('id', commentId)
      .update({
        reactions: safeJsonStringify(reactions),
        updated_at: new Date()
      });
  }

  async updateById(updateId: string, updateData: any): Promise<ClassUpdateWithAuthor | null> {
    const update: any = { updated_at: new Date() };
    if (updateData.title !== undefined) update.title = updateData.title;
    if (updateData.content !== undefined) update.content = updateData.content;
    if (updateData.update_type !== undefined) update.update_type = updateData.update_type;
    if (updateData.attachments !== undefined) update.attachments = safeJsonStringify(updateData.attachments);

    await this.db('class_updates')
      .where('id', updateId)
      .update(update);

    return this.findByIdWithAuthor(updateId);
  }

  async softDelete(updateId: string): Promise<void> {
    await this.db('class_updates')
      .where('id', updateId)
      .update({
        is_deleted: true,
        updated_at: new Date()
      });
  }

  async updatePinStatus(updateId: string, isPinned: boolean): Promise<void> {
    await this.db('class_updates')
      .where('id', updateId)
      .update({
        is_pinned: isPinned,
        updated_at: new Date()
      });
  }
}
