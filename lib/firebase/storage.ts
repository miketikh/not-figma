/**
 * Firebase Storage utilities for image upload and management.
 * Handles uploading images to Firebase Storage and retrieving download URLs.
 */

import { storage } from './config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Uploads an image file to Firebase Storage
 * @param file - Image file to upload
 * @param canvasId - Canvas ID for organizing storage
 * @param imageId - Unique image ID
 * @returns Promise resolving to download URL
 */
export async function uploadImage(
  file: File,
  canvasId: string,
  imageId: string
): Promise<string> {
  try {
    // Extract file extension from filename
    const extension = file.name.split('.').pop()?.toLowerCase() || 'png';

    // Create storage reference: images/{canvasId}/{imageId}.{extension}
    const storageRef = ref(storage, `images/${canvasId}/${imageId}.${extension}`);

    // Upload file to Firebase Storage
    await uploadBytes(storageRef, file);

    // Get and return download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error('Error uploading image:', error);
    throw new Error('Failed to upload image. Please try again.');
  }
}

/**
 * Deletes an image from Firebase Storage
 * @param canvasId - Canvas ID
 * @param imageId - Image ID
 * @param extension - File extension (e.g., 'png', 'jpg')
 * @returns Promise resolving when deletion completes
 */
export async function deleteImage(
  canvasId: string,
  imageId: string,
  extension: string
): Promise<void> {
  try {
    // Create storage reference to exact file path
    const storageRef = ref(storage, `images/${canvasId}/${imageId}.${extension}`);

    // Delete the file
    await deleteObject(storageRef);
  } catch (error: any) {
    // Ignore if file doesn't exist (already deleted)
    if (error.code === 'storage/object-not-found') {
      console.warn('Image already deleted or does not exist:', imageId);
      return;
    }

    console.error('Error deleting image:', error);
    throw new Error('Failed to delete image from storage.');
  }
}

/**
 * Uploads an image from a URL to Firebase Storage
 * Downloads the image from the URL, then uploads to Firebase Storage
 * @param url - Image URL to fetch
 * @param canvasId - Canvas ID
 * @param imageId - Unique image ID
 * @returns Promise resolving to download URL
 */
export async function uploadImageFromURL(
  url: string,
  canvasId: string,
  imageId: string
): Promise<string> {
  try {
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    // Fetch image from URL
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }

    // Convert response to Blob
    const blob = await response.blob();

    // Extract content-type from response headers
    const contentType = response.headers.get('content-type') || 'image/png';

    // Determine file extension from content-type
    const extension = getExtensionFromContentType(contentType);

    // Create storage reference
    const storageRef = ref(storage, `images/${canvasId}/${imageId}.${extension}`);

    // Upload blob to Firebase Storage
    await uploadBytes(storageRef, blob, { contentType });

    // Get and return download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error: any) {
    console.error('Error uploading image from URL:', error);

    // Provide specific error messages
    if (error.name === 'AbortError') {
      throw new Error('Image download timed out. Please check the URL and try again.');
    }

    // Detect CORS errors (can manifest in various ways)
    if (
      error.message?.includes('CORS') ||
      error.message?.includes('Cross-Origin') ||
      error.name === 'TypeError' && error.message?.includes('Failed to fetch')
    ) {
      throw new Error(
        'Cannot load image due to cross-origin restrictions. Try downloading the image and uploading it directly, or use a direct image URL (not a web page).'
      );
    }

    // Network errors
    if (error.name === 'TypeError') {
      throw new Error('Network error. Please check your internet connection and the URL.');
    }

    throw new Error('Failed to import image from URL. Please verify the URL is accessible.');
  }
}

/**
 * Maps content-type to file extension
 * @param contentType - MIME type (e.g., 'image/png')
 * @returns File extension (e.g., 'png')
 */
function getExtensionFromContentType(contentType: string): string {
  const typeMap: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };

  return typeMap[contentType.toLowerCase()] || 'png';
}
