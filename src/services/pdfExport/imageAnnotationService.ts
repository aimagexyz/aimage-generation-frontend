import type { AnnotationDetail } from './types';

/**
 * Image Annotation Service - Handles image loading and annotation overlays
 * KISS: Load image + draw annotation boxes on them
 * Mirrors VideoFrameService API for consistency
 */
export class ImageAnnotationService {
  /**
   * Create annotated image with overlays - handles canvas taint properly
   * Main entry point for image annotation processing
   */
  static async createAnnotatedImage(imageUrl: string, annotations: AnnotationDetail[]): Promise<string> {
    // Add cache busting to prevent browser cache issues with CORS
    const cacheBustedUrl = this.addCacheBusting(imageUrl);

    // For S3 URLs, use blob approach immediately to avoid taint issues
    const isS3Url = imageUrl.includes('amazonaws.com') || imageUrl.includes('s3.');

    if (isS3Url) {
      try {
        return await this.createAnnotatedImageFromBlobWithRetry(cacheBustedUrl, annotations);
      } catch {
        // Fallback to direct method if blob method fails
        return this.createAnnotatedImageDirectWithRetry(cacheBustedUrl, annotations);
      }
    } else {
      return this.createAnnotatedImageDirectWithRetry(cacheBustedUrl, annotations);
    }
  }

  /**
   * Add cache busting parameter to prevent browser caching issues
   */
  private static addCacheBusting(imageUrl: string): string {
    try {
      const url = new URL(imageUrl);
      // Use timestamp + crypto random for better cache busting
      const randomBytes = new Uint8Array(8);
      crypto.getRandomValues(randomBytes);
      const randomString = Array.from(randomBytes, (byte) => byte.toString(36)).join('');
      const cacheBuster = `t=${Date.now()}&r=${randomString}`;

      if (url.search) {
        url.search += `&${cacheBuster}`;
      } else {
        url.search = `?${cacheBuster}`;
      }

      return url.toString();
    } catch (error) {
      console.warn('⚠️ Failed to add cache busting, using original URL:', error);
      return imageUrl;
    }
  }

  /**
   * Create annotated image from blob (prevents canvas taint)
   */
  private static async createAnnotatedImageFromBlob(
    imageUrl: string,
    annotations: AnnotationDetail[],
  ): Promise<string> {
    console.log('🌐 Loading S3 image as blob to prevent taint...');

    // Convert S3 URL to blob first
    const blobUrl = await this.loadS3ImageAsBlob(imageUrl);
    console.log('✅ Blob URL created:', blobUrl);

    try {
      // Process the blob URL (which won't taint the canvas)
      const result = await this.processImageOnCanvas(blobUrl, annotations);
      return result;
    } finally {
      // Clean up blob URL
      URL.revokeObjectURL(blobUrl);
    }
  }

  /**
   * Enhanced blob approach with retry logic
   */
  private static async createAnnotatedImageFromBlobWithRetry(
    imageUrl: string,
    annotations: AnnotationDetail[],
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          // Add extra cache busting for retries
          const retryUrl = this.addCacheBusting(imageUrl);
          return await this.createAnnotatedImageFromBlob(retryUrl, annotations);
        } else {
          return await this.createAnnotatedImageFromBlob(imageUrl, annotations);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All blob approach attempts failed');
  }

  /**
   * Process image on canvas with annotations (common logic)
   */
  private static async processImageOnCanvas(imageUrl: string, annotations: AnnotationDetail[]): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();

      // For blob URLs, no CORS needed. For others, use anonymous CORS
      if (imageUrl.startsWith('blob:')) {
        img.crossOrigin = null;
      } else {
        img.crossOrigin = 'anonymous';
      }

      const handleLoad = () => {
        try {
          // Create canvas for image processing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas context creation failed');
          }

          // Set canvas dimensions to match image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Apply annotation overlays
          if (annotations.length > 0) {
            annotations.forEach((annotation) => {
              // Scale annotation to actual image dimensions
              const scaledAnnotation = this.scaleAnnotationToImage(annotation, img.naturalWidth, img.naturalHeight);

              // Draw overlay
              this.drawAnnotationOverlay(ctx, scaledAnnotation, canvas.width, canvas.height);
            });
          }

          // Convert to base64 with taint detection
          try {
            const dataURL = canvas.toDataURL('image/png', 0.9);
            console.log(`✅ Annotated image created successfully with ${annotations.length} overlays`);
            resolve(dataURL);
          } catch (taintError) {
            console.error('❌ Canvas taint error:', taintError);
            reject(
              new Error('Canvas is tainted and cannot be exported. This usually happens with cross-origin images.'),
            );
          }
        } catch (error) {
          reject(new Error(error instanceof Error ? error.message : 'Image annotation failed'));
        }

        // Cleanup
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };

      const handleError = (event: Event) => {
        console.error('❌ Image loading error in canvas processing:', event);
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
        reject(new Error(`Image loading failed: ${event.type}`));
      };

      // Set up event listeners
      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);

      // Load image
      img.src = imageUrl;
    });
  }

  /**
   * Enhanced direct approach with retry logic and better CORS handling
   */
  private static async createAnnotatedImageDirectWithRetry(
    imageUrl: string,
    annotations: AnnotationDetail[],
    maxRetries: number = 3,
  ): Promise<string> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (attempt > 1) {
          // Add extra cache busting for retries
          const retryUrl = this.addCacheBusting(imageUrl);
          return await this.processImageOnCanvasWithEnhancedCORS(retryUrl, annotations);
        } else {
          return await this.processImageOnCanvasWithEnhancedCORS(imageUrl, annotations);
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          // Wait before retry with exponential backoff
          const delay = 1000 * Math.pow(2, attempt - 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError || new Error('All direct approach attempts failed');
  }

  /**
   * Enhanced canvas processing with better CORS handling
   */
  private static async processImageOnCanvasWithEnhancedCORS(
    imageUrl: string,
    annotations: AnnotationDetail[],
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let corsAttempted = false;

      const handleLoad = () => {
        try {
          // Create canvas for image processing
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas context creation failed');
          }

          // Set canvas dimensions to match image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw image on canvas
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Apply annotation overlays
          if (annotations.length > 0) {
            annotations.forEach((annotation) => {
              // Scale annotation to actual image dimensions
              const scaledAnnotation = this.scaleAnnotationToImage(annotation, img.naturalWidth, img.naturalHeight);

              // Draw overlay
              this.drawAnnotationOverlay(ctx, scaledAnnotation, canvas.width, canvas.height);
            });
          }

          // Convert to base64 with taint detection
          try {
            const dataURL = canvas.toDataURL('image/png', 0.9);
            cleanup();
            resolve(dataURL);
          } catch {
            // Canvas became tainted
            cleanup();
            reject(
              new Error('Canvas is tainted and cannot be exported. This usually happens with cross-origin images.'),
            );
          }
        } catch (error) {
          cleanup();
          reject(new Error(error instanceof Error ? error.message : 'Image annotation failed'));
        }
      };

      const handleError = (event: Event) => {
        // If CORS hasn't been attempted yet and this looks like a CORS issue, try without CORS
        if (!corsAttempted && !imageUrl.startsWith('blob:')) {
          corsAttempted = true;
          cleanup();

          // Retry without CORS
          const imgNoCors = new Image();
          imgNoCors.addEventListener('load', handleLoad);
          imgNoCors.addEventListener('error', () => {
            cleanup();
            reject(new Error(`Image loading failed after CORS fallback: ${event.type}`));
          });

          // No CORS for fallback attempt
          imgNoCors.src = imageUrl;
          return;
        }

        cleanup();
        reject(new Error(`Image loading failed: ${event.type}`));
      };

      const cleanup = () => {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };

      // Set up event listeners
      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);

      // For blob URLs, no CORS needed. For others, use anonymous CORS
      if (imageUrl.startsWith('blob:')) {
        img.crossOrigin = null;
      } else {
        img.crossOrigin = 'anonymous';
      }

      // Load image with cache busting
      img.src = imageUrl;
    });
  }

  /**
   * Process multiple images with annotations - for multi-image subtasks
   */
  static async createAnnotatedImages(
    images: Array<{ imageUrl: string; annotations: AnnotationDetail[] }>,
  ): Promise<Array<{ imageUrl: string; annotatedImageData: string; annotations: AnnotationDetail[] }>> {
    const results: Array<{ imageUrl: string; annotatedImageData: string; annotations: AnnotationDetail[] }> = [];

    for (const { imageUrl, annotations } of images) {
      try {
        const annotatedImageData = await this.createAnnotatedImage(imageUrl, annotations);

        results.push({
          imageUrl,
          annotatedImageData,
          annotations,
        });
      } catch (error) {
        console.warn(`❌ Failed to process image: ${imageUrl}`, error);
        // Continue with other images - don't fail the entire process
      }
    }

    return results;
  }

  /**
   * Draw annotation overlay on canvas - SAME logic as VideoFrameService
   */
  private static drawAnnotationOverlay(
    ctx: CanvasRenderingContext2D,
    annotation: AnnotationDetail,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    if (!annotation.rect) {
      console.warn('⚠️ No rect in annotation for image overlay');
      return;
    }

    const { x, y, width, height } = annotation.rect;
    const color = annotation.color || '#ff0000';
    const tool = annotation.tool || 'rect';

    // Set up drawing style with high visibility
    ctx.strokeStyle = color;
    ctx.lineWidth = 4; // Make it thick for visibility
    ctx.fillStyle = color + '30'; // 30% opacity for fill
    ctx.font = 'bold 18px Arial';

    // Ensure coordinates are within canvas bounds
    const clampedX = Math.max(0, Math.min(x, canvasWidth - 1));
    const clampedY = Math.max(0, Math.min(y, canvasHeight - 1));
    const clampedWidth = Math.min(width, canvasWidth - clampedX);
    const clampedHeight = Math.min(height, canvasHeight - clampedY);

    // Draw annotation based on tool type
    switch (tool) {
      case 'circle': {
        const centerX = clampedX + clampedWidth / 2;
        const centerY = clampedY + clampedHeight / 2;
        const radius = Math.min(clampedWidth, clampedHeight) / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.fill();
        break;
      }

      case 'arrow': {
        this.drawArrow(ctx, clampedX, clampedY, clampedX + clampedWidth, clampedY + clampedHeight, color);
        break;
      }

      case 'rect':
      default: {
        // Rectangle tool or default for unknown tools
        ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);
        ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
        break;
      }
    }

    // Draw annotation label
    const labelText = annotation.text ? annotation.text.substring(0, 15) : 'Annotation';
    const labelX = clampedX + 5;
    const labelY = clampedY - 10;

    // Draw label background
    ctx.fillStyle = color;
    const textMetrics = ctx.measureText(labelText);
    const labelWidth = textMetrics.width + 12;
    const labelHeight = 24;

    // Ensure label stays within canvas bounds
    const finalLabelX = Math.max(0, Math.min(labelX, canvasWidth - labelWidth));
    const finalLabelY = Math.max(labelHeight, Math.min(labelY + labelHeight, canvasHeight));

    ctx.fillRect(finalLabelX, finalLabelY - labelHeight, labelWidth, labelHeight);

    // Draw label text
    ctx.fillStyle = '#ffffff';
    ctx.fillText(labelText, finalLabelX + 6, finalLabelY - 6);
  }

  /**
   * Draw arrow helper function - SAME as VideoFrameService
   */
  private static drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
  ): void {
    const headLength = 15;
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);

    // Draw the main line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.stroke();

    // Draw the arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));
    ctx.stroke();
  }

  /**
   * Scale annotation coordinates to image dimensions
   * SAME logic as VideoFrameService but for images
   */
  private static scaleAnnotationToImage(
    annotation: AnnotationDetail,
    imageWidth: number,
    imageHeight: number,
  ): AnnotationDetail {
    if (!annotation.rect) {
      return annotation;
    }

    // If coordinates seem to be in percentage (0-1), scale to actual pixels
    const rect = annotation.rect;
    let scaledRect = { ...rect };

    if (rect.x <= 1 && rect.y <= 1 && rect.width <= 1 && rect.height <= 1) {
      scaledRect = {
        x: rect.x * imageWidth,
        y: rect.y * imageHeight,
        width: rect.width * imageWidth,
        height: rect.height * imageHeight,
      };
    }

    return {
      ...annotation,
      rect: scaledRect,
    };
  }

  /**
   * Validate image access - check if image can be loaded
   */
  static async validateImageAccess(imageUrl: string): Promise<boolean> {
    return new Promise((resolve) => {
      // For S3 URLs, try WITHOUT CORS first since they're signed
      const isS3Url = imageUrl.includes('amazonaws.com') || imageUrl.includes('s3.');

      const img = new Image();

      if (isS3Url) {
        img.crossOrigin = null;
      } else {
        img.crossOrigin = 'anonymous';
      }

      const cleanup = () => {
        img.removeEventListener('load', handleLoad);
        img.removeEventListener('error', handleError);
      };

      const handleLoad = () => {
        cleanup();
        resolve(true);
      };

      const handleError = () => {
        cleanup();

        // Try fallback with different CORS setting
        const fallbackImg = new Image();
        const fallbackCors = isS3Url ? 'anonymous' : null;
        fallbackImg.crossOrigin = fallbackCors;

        const fallbackCleanup = () => {
          fallbackImg.removeEventListener('load', fallbackLoad);
          fallbackImg.removeEventListener('error', fallbackError);
        };

        const fallbackLoad = () => {
          fallbackCleanup();
          resolve(true);
        };

        const fallbackError = () => {
          fallbackCleanup();
          resolve(false);
        };

        fallbackImg.addEventListener('load', fallbackLoad);
        fallbackImg.addEventListener('error', fallbackError);
        fallbackImg.src = imageUrl;

        // Timeout after 3 seconds for fallback
        setTimeout(() => {
          fallbackCleanup();
          resolve(false);
        }, 3000);
      };

      img.addEventListener('load', handleLoad);
      img.addEventListener('error', handleError);
      img.src = imageUrl;

      // Timeout after 5 seconds
      setTimeout(() => {
        cleanup();
        resolve(false);
      }, 5000);
    });
  }

  /**
   * Check if image format is supported - handles S3 URLs with query parameters
   */
  static isImageFormatSupported(imageUrl: string): boolean {
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'];
    // Extract file extension properly, handling URLs with query parameters (like S3 signed URLs)
    const urlWithoutQuery = imageUrl.split('?')[0]; // Remove query parameters
    const extension = urlWithoutQuery.split('.').pop()?.toLowerCase();

    return extension ? supportedFormats.includes(extension) : false;
  }

  /**
   * Clear browser cache for image URLs (browser console utility)
   */
  static clearImageCache(): void {
    // Clear browser cache programmatically where possible
    if ('caches' in window) {
      caches
        .keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              return caches.delete(cacheName);
            }),
          );
        })
        .then(() => {
          console.log('✅ Service worker caches cleared');
        })
        .catch((error) => {
          console.warn('⚠️ Failed to clear service worker caches:', error);
        });
    }
  }

  /**
   * Test image annotation overlay - for testing purposes
   */
  static async testImageAnnotationOverlay(imageUrl: string): Promise<string> {
    const testAnnotation: AnnotationDetail = {
      id: 'test-annotation',
      text: 'Test Overlay',
      rect: { x: 50, y: 50, width: 100, height: 50 },
      color: '#ff0000',
      tool: 'rect',
      timestamp: new Date().toISOString(),
    };

    return this.createAnnotatedImage(imageUrl, [testAnnotation]);
  }

  /**
   * Alternative method for S3 URLs - fetch and convert to blob URL
   */
  static async loadS3ImageAsBlob(imageUrl: string): Promise<string> {
    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      return blobUrl;
    } catch (error) {
      console.error('❌ Failed   to load S3 image as blob:', error);
      throw error;
    }
  }

  /**
   * Simple test function to debug S3 URL loading in browser console
   */
  static async testS3UrlLoading(imageUrl: string): Promise<void> {
    try {
      // Test 4: Try creating annotated image with test annotation
      try {
        const testAnnotation = {
          id: 'test',
          text: 'Test',
          rect: { x: 10, y: 10, width: 50, height: 50 },
          color: '#ff0000',
          tool: 'rect' as const,
          timestamp: new Date().toISOString(),
        };

        await this.createAnnotatedImage(imageUrl, [testAnnotation]);
      } catch {
        // Ignore annotation test errors
      }
    } catch (error) {
      console.error('❌ TEST FAILED:', error);
    }
  }

  /**
   * Comprehensive image URL diagnostics
   */
  static async diagnoseImageUrl(imageUrl: string): Promise<{
    isValid: boolean;
    issues: string[];
    suggestions: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];

    // Basic validation
    const basicValidation = this.validateBasicUrl(imageUrl);
    if (!basicValidation.isValid) {
      return basicValidation;
    }

    // URL format check
    this.checkUrlFormat(imageUrl, issues, suggestions);

    // File format check
    this.checkFileFormat(imageUrl, issues, suggestions);

    // Common issues check
    this.checkCommonIssues(imageUrl, issues, suggestions);

    // Test loading
    await this.testImageLoading(imageUrl, issues, suggestions);

    const isValid = issues.length === 0;

    return { isValid, issues, suggestions };
  }

  private static validateBasicUrl(imageUrl: string) {
    const issues: string[] = [];
    const suggestions: string[] = [];

    if (!imageUrl) {
      issues.push('Image URL is empty or undefined');
      suggestions.push('Ensure the image URL is properly provided');
      return { isValid: false, issues, suggestions };
    }

    if (typeof imageUrl !== 'string') {
      issues.push(`Image URL is not a string (type: ${typeof imageUrl})`);
      suggestions.push('Ensure the image URL is a string');
      return { isValid: false, issues, suggestions };
    }

    return { isValid: true, issues, suggestions };
  }

  private static checkUrlFormat(imageUrl: string, issues: string[], suggestions: string[]) {
    try {
      new URL(imageUrl);
    } catch {
      // Handle relative URLs - they are acceptable
      if (!imageUrl.startsWith('/') && !imageUrl.startsWith('./') && !imageUrl.startsWith('data:')) {
        issues.push('URL format appears invalid');
        suggestions.push('Ensure the URL is properly formatted (absolute, relative, or data URL)');
      }
    }
  }

  private static checkFileFormat(imageUrl: string, issues: string[], suggestions: string[]) {
    // Extract file extension properly, handling URLs with query parameters (like S3 signed URLs)
    const urlWithoutQuery = imageUrl.split('?')[0]; // Remove query parameters
    const extension = urlWithoutQuery.split('.').pop()?.toLowerCase();
    const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

    if (extension && !supportedFormats.includes(extension)) {
      issues.push(`Unsupported image format: .${extension}`);
      suggestions.push(`Use supported formats: ${supportedFormats.join(', ')}`);
    } else if (extension) {
      console.log(`✅ Supported image format detected: .${extension}`);
    }
  }

  private static checkCommonIssues(imageUrl: string, issues: string[], suggestions: string[]) {
    if (imageUrl.includes('localhost') && !imageUrl.startsWith('http://localhost')) {
      issues.push('Localhost URL might have protocol issues');
      suggestions.push('Ensure localhost URLs include proper protocol (http:// or https://)');
    }

    if (imageUrl.includes(' ')) {
      issues.push('URL contains spaces');
      suggestions.push('URL encode spaces or remove them');
    }
  }

  private static async testImageLoading(imageUrl: string, issues: string[], suggestions: string[]) {
    try {
      const isAccessible = await this.validateImageAccess(imageUrl);
      if (!isAccessible) {
        issues.push('Image is not accessible (loading failed)');
        suggestions.push('Check network connectivity, CORS settings, or image availability');
      } else {
        console.log('✅ Image is accessible');
      }
    } catch (error) {
      issues.push(`Image loading test failed: ${error instanceof Error ? error.message : String(error)}`);
      suggestions.push('Check network connectivity and image availability');
    }
  }
}

/**
 * Quick canvas taint test - run in browser console
 */
export function testCanvasTaint(imageUrl: string): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(false);
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);

      try {
        canvas.toDataURL();
        resolve(true);
      } catch {
        // Canvas is tainted
        resolve(false);
      }
    };

    img.onerror = () => {
      resolve(false);
    };

    img.src = imageUrl;
  });
}

// For debugging in browser console
declare global {
  interface Window {
    ImageAnnotationService?: typeof ImageAnnotationService;
    testCanvasTaint?: typeof testCanvasTaint;
    clearImageCache?: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.ImageAnnotationService = ImageAnnotationService;
  window.testCanvasTaint = testCanvasTaint;
  window.clearImageCache = () => ImageAnnotationService.clearImageCache();
}
