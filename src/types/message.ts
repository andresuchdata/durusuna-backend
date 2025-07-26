export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id?: string;
  content?: string;
  message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
  reply_to_id?: string;
  attachments?: MessageAttachment[];
  metadata?: Record<string, any>;
  is_read: boolean;
  is_edited: boolean;
  is_deleted: boolean;
  edited_at?: Date;
  deleted_at?: Date;
  delivered_at?: Date;
  read_at?: Date;
  read_status: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, ReactionData>;
  created_at: Date;
  updated_at?: Date;
}

export interface MessageAttachment {
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

export interface MessageWithSender extends Message {
  sender: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
    role: 'user' | 'admin';
    is_active: boolean;
  };
  sent_at?: string;
  is_from_me: boolean;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  description?: string;
  avatar_url?: string;
  created_by: string;
  last_message_id?: string;
  last_message_at?: Date;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'member' | 'admin';
  joined_at: Date;
  left_at?: Date;
  last_read_at?: Date;
  unread_count: number;
  is_active: boolean;
  created_at: Date;
  updated_at?: Date;
}

export interface ConversationWithDetails extends Conversation {
  participants: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
    role: 'user' | 'admin';
    is_active: boolean;
  }>;
  other_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
    role: 'user' | 'admin';
    is_active: boolean;
    created_at: Date;
    updated_at?: Date;
  };
  last_message?: {
    content?: string;
    message_type: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
    created_at: Date;
    is_from_me: boolean;
  };
  unread_count: number;
  last_activity?: Date;
  user_role?: 'member' | 'admin';
}

export interface SendMessageRequest {
  conversation_id?: string;
  receiver_id?: string;
  content?: string;
  message_type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
  reply_to_id?: string;
  metadata?: Record<string, any>;
}

export interface MessageSearchParams {
  q?: string;
  user_id?: string;
  message_type?: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji';
  page?: number;
  limit?: number;
}

export interface ConversationPaginationParams {
  page?: number;
  limit?: number;
  cursor?: string;
  loadDirection?: 'before' | 'after';
}

export interface MessagePaginationResponse {
  hasMore: boolean;
  nextCursor?: string;
  prevCursor?: string;
  limit: number;
  loadDirection?: 'before' | 'after';
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface TypingUser {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  lastTyping: Date;
}

export interface ConversationResponse {
  conversations: ConversationWithDetails[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  cached?: boolean;
}

export interface ConversationMessagesResponse {
  messages: MessageWithSender[];
  conversation: Conversation;
  participants: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
    role: 'user' | 'admin';
    is_active: boolean;
    created_at: Date;
    updated_at?: Date;
  }>;
  other_user?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    avatar_url?: string;
    user_type: 'student' | 'teacher' | 'parent' | 'admin';
    role: 'user' | 'admin';
    is_active: boolean;
    created_at: Date;
    updated_at?: Date;
  };
  pagination: MessagePaginationResponse;
  meta: {
    total_unread: number;
    conversation_id: string;
  };
}

export interface LoadMoreMessagesResponse {
  messages: MessageWithSender[];
  pagination: MessagePaginationResponse;
}

export interface SendMessageResponse {
  message: MessageWithSender;
  conversation_id: string;
}

export interface MessageSearchResponse {
  messages: MessageWithSender[];
  pagination: {
    page: number;
    limit: number;
    hasMore: boolean;
  };
  query: string;
} 