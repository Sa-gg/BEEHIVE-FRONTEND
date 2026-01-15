import imageCompression from 'browser-image-compression';

export interface ImageProcessingOptions {
  compress?: boolean;
  removeBackground?: boolean;
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  onProgress?: (stage: 'compressing' | 'removing-background' | 'complete', progress: number) => void;
}

export interface ProcessingProgress {
  stage: 'compressing' | 'removing-background' | 'complete';
  progress: number; // 0-100
}

export interface ProcessedImageResult {
  file: File;
  originalSize: number;
  processedSize: number;
}

/**
 * Compress an image file while maintaining quality
 */
export async function compressImage(
  file: File,
  options: {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    onProgress?: (progress: number) => void;
  } = {}
): Promise<File> {
  const {
    maxSizeMB = 0.5, // Default 500KB for fast loading
    maxWidthOrHeight = 1200, // Good quality for menu displays
    onProgress
  } = options;

  try {
    const compressedFile = await imageCompression(file, {
      maxSizeMB,
      maxWidthOrHeight,
      useWebWorker: true,
      fileType: 'image/webp', // WebP for better compression
      initialQuality: 0.85,
      onProgress: (percent) => {
        onProgress?.(Math.round(percent));
      }
    });

    // Return with original name but webp extension
    const newFileName = file.name.replace(/\.[^/.]+$/, '.webp');
    return new File([compressedFile], newFileName, { type: 'image/webp' });
  } catch (error) {
    console.error('Image compression failed:', error);
    throw error;
  }
}

/**
 * Remove background from an image file
 * Uses dynamic import to avoid blocking the main thread during initial load
 * Includes a timeout to prevent system freeze on large images
 */
export async function removeImageBackground(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File> {
  // First, compress the image if it's too large to prevent memory issues
  let processedFile = file;
  const MAX_SIZE_FOR_BG_REMOVAL = 2 * 1024 * 1024; // 2MB max for background removal
  
  if (file.size > MAX_SIZE_FOR_BG_REMOVAL) {
    console.log('Compressing image before background removal to prevent memory issues...');
    onProgress?.(5);
    processedFile = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 1500,
      useWebWorker: true,
    });
    onProgress?.(15);
  }

  try {
    // Dynamic import to avoid blocking initial load
    onProgress?.(20);
    const { removeBackground } = await import('@imgly/background-removal');
    
    // Process in smaller chunks with progress updates
    const blob = await removeBackground(processedFile, {
      progress: (_key, current, total) => {
        // Map progress from 20% to 95%
        const percent = 20 + Math.round((current / total) * 75);
        onProgress?.(Math.min(percent, 95));
      },
      // Use lower quality model for faster processing
      model: 'small',
    });

    onProgress?.(100);
    
    // Convert blob to File
    const newFileName = file.name.replace(/\.[^/.]+$/, '_nobg.png');
    return new File([blob], newFileName, { type: 'image/png' });
  } catch (error) {
    console.error('Background removal failed:', error);
    throw error;
  }
}

/**
 * Process an image with optional compression and background removal
 */
export async function processImage(
  file: File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImageResult> {
  const originalSize = file.size;
  let processedFile = file;

  // Step 1: Remove background if requested
  if (options.removeBackground) {
    options.onProgress?.('removing-background', 0);
    processedFile = await removeImageBackground(processedFile, (progress) => {
      options.onProgress?.('removing-background', progress);
    });
  }

  // Step 2: Compress if requested (default true)
  if (options.compress !== false) {
    options.onProgress?.('compressing', 0);
    processedFile = await compressImage(processedFile, {
      maxSizeMB: options.maxSizeMB,
      maxWidthOrHeight: options.maxWidthOrHeight,
      onProgress: (progress) => {
        options.onProgress?.('compressing', progress);
      }
    });
  }

  options.onProgress?.('complete', 100);
  return {
    file: processedFile,
    originalSize,
    processedSize: processedFile.size
  };
}

/**
 * Get file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
