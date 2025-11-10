import multer from 'multer';

export interface MulterConfig {
  maxFileSize: number; // in bytes
  maxFiles?: number;
  allowedMimeTypes?: string[];
}

export const UPLOAD_CONFIGS = {
  // General uploads (avatars, general files)
  general: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10,
  },
  
  // Chat media uploads
  chat: {
    maxFileSize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10,
  },
  
  // Class update attachments
  classUpdates: {
    maxFileSize: 50 * 1024 * 1024, // 50MB (to support videos)
    maxFiles: 5,
  },
} as const;

/**
 * Create a multer instance with the specified configuration
 */
export function createMulterUpload(config: MulterConfig): multer.Multer {
  return multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: config.maxFileSize,
      files: config.maxFiles,
    },
    fileFilter: config.allowedMimeTypes
      ? (req, file, cb) => {
          if (config.allowedMimeTypes!.includes(file.mimetype)) {
            cb(null, true);
          } else {
            cb(new Error(`File type ${file.mimetype} is not allowed`));
          }
        }
      : undefined,
  });
}

/**
 * Pre-configured multer instances for common use cases
 */
export const uploadMiddleware = {
  general: createMulterUpload(UPLOAD_CONFIGS.general),
  chat: createMulterUpload(UPLOAD_CONFIGS.chat),
  classUpdates: createMulterUpload(UPLOAD_CONFIGS.classUpdates),
};

/**
 * Helper to determine message type from attachments
 */
export function determineMessageType(
  attachments?: Array<{ type?: string; mimeType?: string }>,
  defaultType: 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji' = 'text'
): 'text' | 'image' | 'video' | 'audio' | 'file' | 'emoji' {
  if (!attachments || attachments.length === 0) {
    return defaultType;
  }

  // If multiple attachments, prioritize by type: video > image > audio > file
  const types = attachments.map(att => {
    const mimeType = att.mimeType || att.type || '';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('audio/')) return 'audio';
    return 'file';
  });

  // Return the highest priority type
  if (types.includes('video')) return 'video';
  if (types.includes('image')) return 'image';
  if (types.includes('audio')) return 'audio';
  return 'file';
}
