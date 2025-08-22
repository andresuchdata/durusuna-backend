import { Knex } from 'knex';
import { 
  ClassUpdate, 
  ClassUpdateWithAuthor, 
  CreateClassUpdateRequest,
  ClassUpdateQueryParams 
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
    const subjectTeachers = await this.db('class_offerings')
      .where('id', subjectOfferingId)
      .where('class_id', classId)
      .select('teacher_id');
    
    return subjectTeachers.map(t => t.teacher_id);
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
}
