import type { AnnotationDetail } from './types';

/**
 * Enhanced Video Frame Service with Annotation Overlays - DEBUGGED VERSION
 * KISS: Extract frames + draw annotation boxes on them
 */
export class VideoFrameService {
  /**
   * Extract a single frame at specific timestamp WITH annotation overlay
   * Enhanced with proper coordinate scaling and overlay drawing
   */
  static async extractFrameAtTimestamp(
    videoUrl: string,
    timestampSeconds: number,
    annotation?: AnnotationDetail,
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';

      const handleLoadedMetadata = () => {
        console.log(`🎬 Video loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);
        video.currentTime = timestampSeconds;
      };

      const handleSeeked = () => {
        try {
          // Create canvas for frame extraction
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            throw new Error('Canvas context creation failed');
          }

          // Set canvas dimensions to match video
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Draw video frame
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          // Apply annotation overlay if provided
          if (annotation) {
            // Scale annotation to actual video dimensions
            const scaledAnnotation = this.scaleAnnotationToVideo(annotation, video.videoWidth, video.videoHeight);

            // Draw overlay with canvas dimensions
            this.drawAnnotationOverlay(ctx, scaledAnnotation, canvas.width, canvas.height);
          }

          // Convert to base64
          const dataURL = canvas.toDataURL('image/png', 0.9);

          resolve(dataURL);
        } catch (error) {
          console.error('❌ Frame extraction failed:', error);
          reject(new Error(error instanceof Error ? error.message : 'Frame extraction failed'));
        } finally {
          // Cleanup
          video.removeEventListener('loadedmetadata', handleLoadedMetadata);
          video.removeEventListener('seeked', handleSeeked);
          video.removeEventListener('error', handleError);
        }
      };

      const handleError = (event: Event) => {
        const errorMessage = `Video loading failed: ${event.type}`;
        console.error('❌ Video loading error:', errorMessage);
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('seeked', handleSeeked);
        video.removeEventListener('error', handleError);
        reject(new Error(errorMessage));
      };

      // Set up event listeners
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('seeked', handleSeeked);
      video.addEventListener('error', handleError);

      // Load video
      console.log(`🎬 Loading video for frame extraction at ${timestampSeconds}s:`, videoUrl);
      video.src = videoUrl;
      video.load();
    });
  }

  /**
   * Draw annotation overlay on canvas - ENHANCED with debugging
   * Shows WHERE the annotation is located on the frame
   */
  private static drawAnnotationOverlay(
    ctx: CanvasRenderingContext2D,
    annotation: AnnotationDetail,
    canvasWidth: number,
    canvasHeight: number,
  ): void {
    if (!annotation.rect) {
      console.warn('⚠️ No rect in annotation');
      return;
    }

    const { x, y, width, height } = annotation.rect;
    const color = annotation.color || '#ff0000'; // Use red as default for visibility
    const tool = annotation.tool || 'rect';

    console.log('🎯 Drawing overlay with:', {
      position: { x, y, width, height },
      color,
      tool,
      canvasSize: { width: canvasWidth, height: canvasHeight },
    });

    // Set up drawing style with high visibility
    ctx.strokeStyle = color;
    ctx.lineWidth = 4; // Make it thicker for visibility
    ctx.fillStyle = color + '30'; // 30% opacity for fill
    ctx.font = 'bold 18px Arial';

    // Ensure coordinates are within canvas bounds
    const clampedX = Math.max(0, Math.min(x, canvasWidth - 1));
    const clampedY = Math.max(0, Math.min(y, canvasHeight - 1));
    const clampedWidth = Math.min(width, canvasWidth - clampedX);
    const clampedHeight = Math.min(height, canvasHeight - clampedY);

    console.log('🎯 Clamped coordinates:', {
      original: { x, y, width, height },
      clamped: { x: clampedX, y: clampedY, width: clampedWidth, height: clampedHeight },
    });

    // Draw annotation based on tool type
    switch (tool) {
      case 'rect': {
        console.log('🔳 Drawing rectangle');
        // Draw rectangle outline
        ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);
        // Draw semi-transparent fill
        ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
        break;
      }

      case 'circle': {
        console.log('⭕ Drawing circle');
        // Draw circle
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
        console.log('➡️ Drawing arrow');
        // Draw arrow
        this.drawArrow(ctx, clampedX, clampedY, clampedX + clampedWidth, clampedY + clampedHeight, color);
        break;
      }

      default: {
        console.log('🔳 Drawing default rectangle');
        // Default to rectangle
        ctx.strokeRect(clampedX, clampedY, clampedWidth, clampedHeight);
        ctx.fillRect(clampedX, clampedY, clampedWidth, clampedHeight);
        break;
      }
    }

    // Draw annotation label with improved visibility
    const labelText = annotation.text ? annotation.text.substring(0, 15) : '📌';
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

    console.log('✅ Annotation overlay drawing completed');
  }

  /**
   * Draw arrow annotation - ENHANCED
   */
  private static drawArrow(
    ctx: CanvasRenderingContext2D,
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    color: string,
  ): void {
    const headLength = 25; // Bigger arrow head
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.strokeStyle = color;
    ctx.lineWidth = 4; // Thicker line
    ctx.beginPath();

    // Draw arrow line
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);

    // Draw arrow head
    ctx.lineTo(toX - headLength * Math.cos(angle - Math.PI / 6), toY - headLength * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headLength * Math.cos(angle + Math.PI / 6), toY - headLength * Math.sin(angle + Math.PI / 6));

    ctx.stroke();
  }

  /**
   * Extract frames for annotations with overlays - ENHANCED to ensure ALL annotations get overlays
   */
  static async extractAnnotationFrames(
    videoUrl: string,
    annotations: AnnotationDetail[],
  ): Promise<Array<{ timestamp: number; frameData: string; annotation: AnnotationDetail }>> {
    // Get annotations with timestamps
    const timestampAnnotations = annotations.filter((ann) => ann.start_at !== undefined && ann.start_at !== null);

    if (timestampAnnotations.length === 0) {
      console.warn('⚠️ No annotations with timestamps found');
      return [];
    }

    console.log(`🎯 Extracting ${timestampAnnotations.length} frames with annotation overlays:`, videoUrl);
    console.log(
      '🎯 Annotation details:',
      timestampAnnotations.map((ann) => ({
        timestamp: ann.start_at,
        hasRect: !!ann.rect,
        rect: ann.rect,
        text: ann.text,
        tool: ann.tool,
        color: ann.color,
      })),
    );

    // Process frames one by one with annotation overlays
    const results: Array<{ timestamp: number; frameData: string; annotation: AnnotationDetail }> = [];

    for (const annotation of timestampAnnotations) {
      try {
        console.log(`📍 Extracting frame at ${annotation.start_at}s with overlay...`);
        console.log('📍 Original annotation data:', annotation);

        // ENSURE ANNOTATION HAS OVERLAY DATA
        const enhancedAnnotation = this.ensureAnnotationHasRect(annotation);
        console.log('📍 Enhanced annotation data:', enhancedAnnotation);

        // Extract frame WITH annotation overlay (using enhanced annotation)
        const frameData = await this.extractFrameAtTimestamp(
          videoUrl,
          annotation.start_at!,
          enhancedAnnotation, // Pass enhanced annotation for overlay drawing
        );

        results.push({
          timestamp: annotation.start_at!,
          frameData,
          annotation: enhancedAnnotation, // Store enhanced annotation
        });

        console.log(`✅ Frame with overlay extracted at ${annotation.start_at}s`);
      } catch (error) {
        console.warn(`❌ Failed to extract frame at ${annotation.start_at}s:`, error);
        // Continue with other frames - don't fail the entire process
      }
    }

    console.log(`🎯 Successfully extracted ${results.length}/${timestampAnnotations.length} frames with overlays`);
    return results;
  }

  /**
   * Ensure annotation has rect data for overlay drawing
   * Creates default rect if missing
   */
  private static ensureAnnotationHasRect(annotation: AnnotationDetail): AnnotationDetail {
    // If annotation already has rect, use it
    if (annotation.rect && annotation.rect.width > 0 && annotation.rect.height > 0) {
      console.log('✅ Annotation already has valid rect:', annotation.rect);
      return {
        ...annotation,
        color: annotation.color || '#ff0000', // Ensure we have a color
        tool: annotation.tool || 'rect', // Ensure we have a tool
      };
    }

    // Create default rect based on annotation type or create a centered rectangle
    let defaultRect;

    // Try to use reasonable defaults based on video dimensions (assuming HD)
    const videoWidth = 1920; // Will be adjusted when we know actual dimensions
    const videoHeight = 1080;

    if (annotation.tool === 'circle') {
      // Default circle in center
      defaultRect = {
        x: videoWidth * 0.4,
        y: videoHeight * 0.4,
        width: videoWidth * 0.2,
        height: videoHeight * 0.2,
      };
    } else if (annotation.tool === 'arrow') {
      // Default arrow from top-left to bottom-right
      defaultRect = {
        x: videoWidth * 0.3,
        y: videoHeight * 0.3,
        width: videoWidth * 0.3,
        height: videoHeight * 0.3,
      };
    } else {
      // Default rectangle in center
      defaultRect = {
        x: videoWidth * 0.25,
        y: videoHeight * 0.25,
        width: videoWidth * 0.5,
        height: videoHeight * 0.5,
      };
    }

    console.log('📍 Creating default rect for annotation:', defaultRect);

    return {
      ...annotation,
      rect: defaultRect,
      color: annotation.color || '#ff0000',
      tool: annotation.tool || 'rect',
    };
  }

  /**
   * Scale annotation coordinates to video dimensions
   */
  private static scaleAnnotationToVideo(
    annotation: AnnotationDetail,
    videoWidth: number,
    videoHeight: number,
  ): AnnotationDetail {
    if (!annotation.rect) {
      return annotation;
    }

    // If coordinates seem to be in percentage (0-1), scale to actual pixels
    const rect = annotation.rect;
    let scaledRect = { ...rect };

    if (rect.x <= 1 && rect.y <= 1 && rect.width <= 1 && rect.height <= 1) {
      console.log('📍 Scaling percentage coordinates to pixels');
      scaledRect = {
        x: rect.x * videoWidth,
        y: rect.y * videoHeight,
        width: rect.width * videoWidth,
        height: rect.height * videoHeight,
      };
    }

    return {
      ...annotation,
      rect: scaledRect,
    };
  }

  /**
   * Simple video format check
   */
  static isVideoSupported(videoUrl: string): boolean {
    const formats = ['.mp4', '.webm', '.mov'];
    return formats.some((format) => videoUrl.toLowerCase().includes(format));
  }

  /**
   * Validate video format support
   */
  static isVideoFormatSupported(videoUrl: string): boolean {
    const supportedFormats = ['.mp4', '.webm', '.ogg', '.mov'];
    return supportedFormats.some((format) => videoUrl.toLowerCase().includes(format));
  }

  /**
   * Get video dimensions
   */
  static async getVideoDimensions(videoUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';

      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('Timeout getting video dimensions'));
      }, 5000);

      const cleanup = () => {
        clearTimeout(timeout);
        video.removeEventListener('loadedmetadata', onLoadedMetadata);
        video.removeEventListener('error', onError);
        video.src = '';
        video.remove();
      };

      const onLoadedMetadata = () => {
        const dimensions = {
          width: video.videoWidth,
          height: video.videoHeight,
        };
        cleanup();
        resolve(dimensions);
      };

      const onError = () => {
        cleanup();
        reject(new Error('Failed to get video dimensions'));
      };

      video.addEventListener('loadedmetadata', onLoadedMetadata);
      video.addEventListener('error', onError);
      video.src = videoUrl;
    });
  }

  /**
   * Validate video accessibility
   */
  static async validateVideoAccess(videoUrl: string): Promise<boolean> {
    try {
      await this.getVideoDimensions(videoUrl);
      return true;
    } catch (error) {
      console.error('Video validation failed:', error);
      return false;
    }
  }

  /**
   * Test annotation overlay drawing with sample data - FOR DEBUGGING
   */
  static async testAnnotationOverlay(videoUrl: string, timestamp: number = 0): Promise<string> {
    // Create a test annotation with known coordinates
    const testAnnotation: AnnotationDetail = {
      id: 'test-overlay',
      text: 'TEST OVERLAY',
      rect: {
        x: 50,
        y: 50,
        width: 200,
        height: 150,
      },
      color: '#ff0000',
      tool: 'rect',
      type: 'annotation',
      version: 1,
      timestamp: new Date().toISOString(),
      start_at: timestamp,
      end_at: timestamp + 1,
    };

    console.log('🧪 Testing annotation overlay with sample data:', testAnnotation);

    return this.extractFrameAtTimestamp(videoUrl, timestamp, testAnnotation);
  }

  /**
   * Debug annotation data structure
   */
  static debugAnnotationData(annotations: AnnotationDetail[]): void {
    console.log('🔍 DEBUGGING ANNOTATION DATA:');
    console.log('Total annotations:', annotations.length);

    annotations.forEach((ann, index) => {
      console.log(`\n📍 Annotation ${index + 1}:`);
      console.log('  ID:', ann.id);
      console.log('  Text:', ann.text);
      console.log('  Has rect:', !!ann.rect);
      console.log('  Rect data:', ann.rect);
      console.log('  Color:', ann.color);
      console.log('  Tool:', ann.tool);
      console.log('  Type:', ann.type);
      console.log('  Start time:', ann.start_at);
      console.log('  End time:', ann.end_at);
    });
  }
}
