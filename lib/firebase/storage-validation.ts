/**
 * Image validation utilities for file type, size, and dimensions.
 * Used for client-side validation before Firebase Storage upload.
 */

// Validation constants
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB in bytes
export const MAX_DIMENSIONS = { width: 4096, height: 4096 }; // Figma standard
export const ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
];

export const ALLOWED_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'];

/**
 * Validation result type
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Image dimensions type
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Validates an image file for type and size
 * @param file - File to validate
 * @returns Validation result with error message if invalid
 */
export function validateImageFile(file: File): ValidationResult {
  // Check file type
  const typeValid = isValidImageType(file);
  if (!typeValid) {
    return {
      valid: false,
      error: getFileTypeError(file),
    };
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: getFileSizeError(file.size),
    };
  }

  return { valid: true };
}

/**
 * Checks if file has valid image MIME type or extension
 * @param file - File to check
 * @returns True if file type is valid
 */
function isValidImageType(file: File): boolean {
  // Check MIME type first
  if (file.type && ALLOWED_MIME_TYPES.includes(file.type.toLowerCase())) {
    return true;
  }

  // Fallback to extension check if MIME type is missing or generic
  const fileName = file.name.toLowerCase();
  return ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
}

/**
 * Generates user-friendly error message for invalid file type
 * @param file - Invalid file
 * @returns Error message
 */
function getFileTypeError(file: File): string {
  const extension = file.name.split('.').pop()?.toUpperCase() || 'unknown';
  return `Unsupported file format: ${extension}. Please use PNG, JPEG, WebP, GIF, or SVG.`;
}

/**
 * Generates user-friendly error message for file size limit
 * @param size - File size in bytes
 * @returns Error message with actual size
 */
function getFileSizeError(size: number): string {
  const sizeMB = (size / 1024 / 1024).toFixed(2);
  const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);
  return `File size (${sizeMB} MB) exceeds the ${maxSizeMB} MB limit. Please use a smaller image.`;
}

/**
 * Loads image and returns natural dimensions
 * @param file - Image file to measure
 * @returns Promise resolving to image dimensions
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl); // Clean up
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl); // Clean up
      reject(new Error('Failed to load image'));
    };

    img.src = objectUrl;
  });
}

/**
 * Validates image dimensions against maximum allowed size
 * @param dimensions - Image dimensions to validate
 * @returns Validation result with error message if dimensions exceed limit
 */
export function validateImageDimensions(dimensions: ImageDimensions): ValidationResult {
  if (dimensions.width > MAX_DIMENSIONS.width || dimensions.height > MAX_DIMENSIONS.height) {
    return {
      valid: false,
      error: `Image dimensions (${dimensions.width} x ${dimensions.height}) exceed the maximum allowed size of ${MAX_DIMENSIONS.width} x ${MAX_DIMENSIONS.height} pixels.`,
    };
  }

  return { valid: true };
}

/**
 * Validates and sanitizes image URL for security
 * Blocks malicious schemes and private IPs
 * @param url - URL to validate
 * @returns Validation result with error message if URL is invalid
 */
export function sanitizeImageURL(url: string): ValidationResult {
  // Basic URL validation
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return {
      valid: false,
      error: 'Invalid URL format. Please enter a valid http:// or https:// URL.',
    };
  }

  // Only allow http and https schemes
  const allowedSchemes = ['http:', 'https:'];
  if (!allowedSchemes.includes(parsedUrl.protocol)) {
    return {
      valid: false,
      error: `URL scheme "${parsedUrl.protocol}" is not allowed. Only http:// and https:// URLs are supported.`,
    };
  }

  // Block localhost
  const hostname = parsedUrl.hostname.toLowerCase();
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]') {
    return {
      valid: false,
      error: 'Localhost URLs are not allowed for security reasons.',
    };
  }

  // Block private IP ranges
  if (isPrivateIP(hostname)) {
    return {
      valid: false,
      error: 'Private IP addresses are not allowed for security reasons.',
    };
  }

  return { valid: true };
}

/**
 * Checks if hostname is a private IP address
 * @param hostname - Hostname to check
 * @returns True if hostname is a private IP
 */
function isPrivateIP(hostname: string): boolean {
  // IPv4 private ranges: 10.x.x.x, 172.16-31.x.x, 192.168.x.x
  const ipv4Pattern = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = hostname.match(ipv4Pattern);

  if (!match) {
    return false; // Not an IPv4 address
  }

  const [, a, b] = match.map(Number);

  // Check private ranges
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16

  return false;
}

/**
 * Complete validation pipeline for file upload
 * Validates type, size, and dimensions
 * @param file - File to validate
 * @returns Promise resolving to validation result
 */
export async function validateImageUpload(file: File): Promise<ValidationResult> {
  // Validate file type and size
  const fileValidation = validateImageFile(file);
  if (!fileValidation.valid) {
    return fileValidation;
  }

  // Get and validate dimensions
  try {
    const dimensions = await getImageDimensions(file);
    return validateImageDimensions(dimensions);
  } catch {
    return {
      valid: false,
      error: 'Failed to read image file. The file may be corrupted.',
    };
  }
}
