/**
 * Image loading and caching utilities for Konva canvas.
 * Handles loading HTMLImageElement from URLs and dimension calculations.
 */

/**
 * Image dimensions type
 */
export interface ImageDimensions {
  width: number;
  height: number;
}

/**
 * Scaled image dimensions result
 */
export interface ScaledDimensions extends ImageDimensions {
  scaled: boolean; // Indicates if scaling was applied
}

/**
 * Simple LRU cache for loaded images
 * Prevents redundant downloads when switching between canvases
 */
class ImageCache {
  private cache: Map<string, HTMLImageElement> = new Map();
  private maxSize: number = 100;

  get(url: string): HTMLImageElement | undefined {
    return this.cache.get(url);
  }

  set(url: string, image: HTMLImageElement): void {
    // If cache is full, remove oldest entry (first entry in Map)
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(url, image);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Global image cache instance
const imageCache = new ImageCache();

/**
 * Loads an image from URL and returns HTMLImageElement
 * Uses cache to prevent redundant downloads
 * @param url - Image URL to load
 * @returns Promise resolving to loaded HTMLImageElement
 */
export async function loadImageFromURL(url: string): Promise<HTMLImageElement> {
  // Check cache first
  const cachedImage = imageCache.get(url);
  if (cachedImage) {
    return cachedImage;
  }

  // Load image from URL
  return new Promise((resolve, reject) => {
    const img = new Image();

    // Set crossOrigin to handle CORS (required for Konva rendering)
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      // Cache the loaded image
      imageCache.set(url, img);
      resolve(img);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${url}`));
    };

    // Set src to trigger load
    img.src = url;
  });
}

/**
 * Extracts image dimensions from a File object
 * @param file - Image file to measure
 * @returns Promise resolving to image dimensions
 */
export async function getImageDimensions(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);

      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };

    img.onerror = () => {
      // Clean up object URL
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Failed to load image from file'));
    };

    img.src = objectUrl;
  });
}

/**
 * Scales image dimensions to fit within maximum bounds while maintaining aspect ratio
 * @param width - Original width
 * @param height - Original height
 * @param maxWidth - Maximum allowed width
 * @param maxHeight - Maximum allowed height
 * @returns Scaled dimensions with flag indicating if scaling occurred
 */
export function scaleImageToFit(
  width: number,
  height: number,
  maxWidth: number,
  maxHeight: number
): ScaledDimensions {
  // If image already fits, return original dimensions
  if (width <= maxWidth && height <= maxHeight) {
    return { width, height, scaled: false };
  }

  // Calculate aspect ratio
  const aspectRatio = width / height;

  // Calculate scaled dimensions
  let newWidth = width;
  let newHeight = height;

  // Scale down if width exceeds max
  if (newWidth > maxWidth) {
    newWidth = maxWidth;
    newHeight = newWidth / aspectRatio;
  }

  // Scale down if height still exceeds max
  if (newHeight > maxHeight) {
    newHeight = maxHeight;
    newWidth = newHeight * aspectRatio;
  }

  return {
    width: Math.round(newWidth),
    height: Math.round(newHeight),
    scaled: true,
  };
}

/**
 * Clears the image cache
 * Useful for testing or memory management
 */
export function clearImageCache(): void {
  imageCache.clear();
}
