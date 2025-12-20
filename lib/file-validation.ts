// File validation utilities for upload security

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
export const MAX_FILES_PER_UPLOAD = 5;

// General file uploads (for regular attachments)
export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
  'text/plain'
];

export const ALLOWED_EXTENSIONS = [
  'pdf', 'doc', 'docx', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'gif', 'txt'
];

// Clarification uploads - PDF only
export const CLARIFICATION_ALLOWED_MIME_TYPES = [
  'application/pdf'
];

export const CLARIFICATION_ALLOWED_EXTENSIONS = [
  'pdf'
];

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateFile(file: File, isClarification: boolean = false): FileValidationResult {
  // Use appropriate validation rules based on context
  const allowedMimeTypes = isClarification ? CLARIFICATION_ALLOWED_MIME_TYPES : ALLOWED_MIME_TYPES;
  const allowedExtensions = isClarification ? CLARIFICATION_ALLOWED_EXTENSIONS : ALLOWED_EXTENSIONS;
  
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      isValid: false,
      error: `File "${file.name}" exceeds the 10MB size limit`
    };
  }

  // Check MIME type
  if (!allowedMimeTypes.includes(file.type)) {
    const fileTypeMessage = isClarification 
      ? `Only PDF files are allowed for clarification uploads. "${file.name}" is ${file.type}`
      : `File type "${file.type}" is not allowed for "${file.name}"`;
    return {
      isValid: false,
      error: fileTypeMessage
    };
  }

  // Check file extension
  const extension = file.name.split('.').pop()?.toLowerCase();
  if (!extension || !allowedExtensions.includes(extension)) {
    const extensionMessage = isClarification
      ? `Only PDF files are allowed for clarification uploads. "${file.name}" has extension "${extension}"`
      : `File extension "${extension}" is not allowed for "${file.name}"`;
    return {
      isValid: false,
      error: extensionMessage
    };
  }

  // Check for potentially dangerous filenames
  if (file.name.includes('..') || file.name.includes('/') || file.name.includes('\\')) {
    return {
      isValid: false,
      error: `Invalid filename: "${file.name}"`
    };
  }

  return { isValid: true };
}

export function validateFiles(files: File[], isClarification: boolean = false): FileValidationResult {
  // Check number of files
  if (files.length > MAX_FILES_PER_UPLOAD) {
    return {
      isValid: false,
      error: `Maximum ${MAX_FILES_PER_UPLOAD} files allowed per upload`
    };
  }

  // Validate each file
  for (const file of files) {
    const result = validateFile(file, isClarification);
    if (!result.isValid) {
      return result;
    }
  }

  return { isValid: true };
}

export function sanitizeFilename(filename: string): string {
  // Remove or replace dangerous characters
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .substring(0, 100); // Limit length
}

export function generateSecureFilename(originalName: string): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop()?.toLowerCase() || '';
  const sanitizedName = sanitizeFilename(originalName.replace(/\.[^/.]+$/, ''));
  
  return `${timestamp}_${randomString}_${sanitizedName}.${extension}`;
}