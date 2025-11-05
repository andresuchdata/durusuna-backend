export interface ClassUpdate {
  id: string;
  class_id: string;
  class_name?: string;
  author_id: string;
  title?: string;
  content: string;
  update_type: 'announcement' | 'homework' | 'reminder' | 'event';
  is_pinned: boolean;
  is_deleted: boolean;
  attachments?: ClassUpdateAttachment[];
  reactions?: Record<string, ReactionData>;
  comment_count: number;
  created_at: Date;
  updated_at?: Date;
}

export interface ClassUpdateAttachment {
  id: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  key: string;
  fileType: 'image' | 'video' | 'audio' | 'document' | 'other';
  isImage: boolean;
  isVideo: boolean;
  isAudio: boolean;
  isDocument: boolean;
  sizeFormatted: string;
  uploadedBy: string;
  uploadedAt: string;
  metadata?: Record<string, any>;
}

export interface ReactionData {
  count: number;
  users: string[];
}

export interface ClassUpdateWithAuthor extends ClassUpdate {
  author: {
    id: string;
    class_name?: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
    role: 'user' | 'admin';
  };
}

export interface ClassUpdateComment {
  id: string;
  class_update_id: string;
  author_id: string;
  content: string;
  reply_to_id?: string;
  reactions?: Record<string, number>;
  is_edited: boolean;
  edited_at?: Date;
  is_deleted: boolean;
  deleted_at?: Date;
  created_at: Date;
  updated_at: Date;
}

export interface ClassUpdateCommentWithAuthor extends ClassUpdateComment {
  author: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
  };
  replies?: ClassUpdateCommentWithAuthor[];
}

export interface CreateClassUpdateRequest {
  class_id: string;
  title?: string;
  content: string;
  update_type?: 'announcement' | 'homework' | 'reminder' | 'event';
  is_pinned?: boolean;
  attachments?: ClassUpdateAttachment[];
}

export interface UpdateClassUpdateRequest extends Partial<CreateClassUpdateRequest> {
  is_deleted?: boolean;
}

export interface CreateCommentRequest {
  content: string;
  reply_to_id?: string;
}

export interface ClassUpdateQueryParams {
  page?: number;
  limit?: number;
  type?: 'announcement' | 'homework' | 'reminder' | 'event';
  author_id?: string;
  from_date?: string;
  to_date?: string;
  is_pinned?: boolean;
  exclude_pinned?: string;
  subject_offering_id?: string;
  search?: string;
  class_id?: string;
}

export interface ClassUpdatesResponse {
  updates: ClassUpdateWithAuthor[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

export interface ClassUpdateResponse {
  update: ClassUpdateWithAuthor;
  comments: ClassUpdateCommentWithAuthor[];
}

export interface UploadAttachmentsRequest {
  class_id: string;
}

export interface UploadAttachmentsResponse {
  success: boolean;
  attachments: ClassUpdateAttachment[];
  count: number;
}

export interface AddReactionRequest {
  emoji: string;
}

export interface ReactionResponse {
  message: string;
  reactions: Record<string, ReactionData>;
} 