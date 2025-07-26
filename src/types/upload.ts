export interface UploadFileRequest {
  folder?: string;
  processImage?: boolean | string;
}

export interface UploadFileResponse {
  success: boolean;
  file: EnhancedFileInfo;
}

export interface UploadMultipleFilesRequest {
  folder?: string;
  processImage?: boolean | string;
}

export interface UploadMultipleFilesResponse {
  success: boolean;
  files: EnhancedFileInfo[];
  count: number;
}

export interface EnhancedFileInfo {
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
  metadata?: Record<string, any>;
  thumbnailUrl?: string;
  previewUrl?: string;
}

export interface FileValidationError {
  file: string;
  index: number;
  errors: string[];
}

export interface PresignedUploadRequest {
  filename: string;
  contentType: string;
  folder?: string;
}

export interface PresignedUploadResponse {
  success: boolean;
  presignedUrl: string;
  key: string;
  expiresIn: number;
}

export interface PresignedDownloadRequest {
  key: string;
}

export interface PresignedDownloadResponse {
  success: boolean;
  presignedUrl: string;
  expiresIn: number;
}

export interface DeleteFileResponse {
  success: boolean;
  message: string;
}

export interface FileUploadOptions {
  processImage?: boolean;
  imageOptions?: {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    createThumbnail?: boolean;
  };
  customMetadata?: Record<string, string>;
}

export interface FileToUpload {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ServeFileParams {
  folder: string;
  year: string;
  month: string;
  filename: string;
}

export interface LegacyServeParams {
  filename: string;
  folder?: string;
}

export interface UploadError {
  error: string;
  message?: string;
  details?: FileValidationError[];
} 