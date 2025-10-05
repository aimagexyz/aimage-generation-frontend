/**
 * Image Source Utilities
 * Utility functions for extracting source information from different image contexts
 * Follows DRY principle by centralizing source detection logic
 * KISS principle: Simple functions with clear purposes
 */

import type { ImageSourceInfo } from '@/types/userPreferences';

// Type for generated reference metadata stored in conversation messages
interface GeneratedReferenceMetadata {
  id: string;
  image_url: string;
  image_path: string;
  base_prompt: string;
  enhanced_prompt: string;
}

/**
 * Extract S3 path from a presigned URL
 * KISS: Simple URL parsing for S3 paths
 */
export function extractS3PathFromUrl(url: string): string | null {
  if (!url) {
    return null;
  }

  // Handle s3:// format
  if (url.startsWith('s3://')) {
    const parts = url.split('/', 3);
    if (parts.length > 3) {
      return parts[3];
    }
  }

  // Handle presigned URLs - extract path from URL
  // Example: https://bucket.s3.region.amazonaws.com/path/to/file.jpg?X-Amz-...
  if (url.includes('amazonaws.com/')) {
    try {
      // Find the path part after the domain
      const domainEnd = url.indexOf('.amazonaws.com/') + '.amazonaws.com/'.length;
      const queryStart = url.indexOf('?', domainEnd);

      if (queryStart === -1) {
        // No query parameters
        return url.substring(domainEnd);
      } else {
        // Extract path before query parameters
        return url.substring(domainEnd, queryStart);
      }
    } catch (error) {
      console.warn('Failed to extract S3 path from URL:', url, error);
    }
  }

  return null;
}

/**
 * Create source info for generated reference images
 * Used in conversation panels and reference generation contexts
 */
export function createGeneratedReferenceSourceInfo(
  referenceId: string,
  imageUrl: string,
  displayName?: string,
  basePrompt?: string,
): ImageSourceInfo | null {
  const imagePath = extractS3PathFromUrl(imageUrl);
  if (!imagePath) {
    return null;
  }

  return {
    source_type: 'generated_reference',
    source_id: referenceId,
    image_path: imagePath,
    display_name: basePrompt || displayName || `Generated Reference ${new Date().toLocaleDateString('ja-JP')}`,
    base_prompt: basePrompt, // Use base_prompt for better UX
  };
}

/**
 * Create source info for character images
 * Used in character galleries and character display panels
 */
export function createCharacterSourceInfo(
  characterId: string,
  imageUrl: string,
  characterName?: string,
): ImageSourceInfo | null {
  const imagePath = extractS3PathFromUrl(imageUrl);
  if (!imagePath) {
    return null;
  }

  return {
    source_type: 'character',
    source_id: characterId,
    image_path: imagePath,
    display_name: characterName ? `${characterName} Reference` : 'Character Reference',
  };
}

/**
 * Create source info for item images
 * Used in item search panels and item galleries
 */
export function createItemSourceInfo(itemId: string, imageUrl: string, itemName?: string): ImageSourceInfo | null {
  const imagePath = extractS3PathFromUrl(imageUrl);
  if (!imagePath) {
    return null;
  }

  return {
    source_type: 'item',
    source_id: itemId,
    image_path: imagePath,
    display_name: itemName || 'Item Image',
  };
}

/**
 * Infer source information from conversation message context
 * Used when liking images from conversation panels
 */
export function inferSourceInfoFromConversation(
  imageUrl: string,
  messageId?: number,
  messageMetadata?: Record<string, unknown>,
): ImageSourceInfo | null {
  // Try to find the generated reference in the stored metadata first
  if (messageMetadata?.generatedReferences && Array.isArray(messageMetadata.generatedReferences)) {
    const generatedRef = (messageMetadata.generatedReferences as GeneratedReferenceMetadata[]).find(
      (ref) => ref.image_url === imageUrl,
    );

    if (generatedRef && generatedRef.id && generatedRef.image_path) {
      return {
        source_type: 'generated_reference',
        source_id: generatedRef.id,
        image_path: generatedRef.image_path,
        display_name: generatedRef.base_prompt || `Generated Reference ${new Date().toLocaleDateString('ja-JP')}`,
        base_prompt: generatedRef.base_prompt, // Use base_prompt for better UX
      };
    }
  }

  // Fallback to S3 path extraction for backward compatibility
  const imagePath = extractS3PathFromUrl(imageUrl);
  if (!imagePath) {
    return null;
  }

  // If message has job ID, it's likely from generation (legacy support)
  const jobId = messageMetadata?.jobId as string;
  if (jobId) {
    return {
      source_type: 'generated_reference',
      source_id: jobId, // Use job ID as a proxy for reference ID
      image_path: imagePath,
      display_name: `Generated Image from ${new Date().toLocaleDateString('ja-JP')}`,
    };
  }

  // Final fallback to message-based source
  if (messageId) {
    return {
      source_type: 'conversation',
      source_id: messageId.toString(),
      image_path: imagePath,
      display_name: `Conversation Image ${messageId}`,
    };
  }

  return null;
}

/**
 * Create fallback source info when no context is available
 * Used as last resort for legacy compatibility
 */
export function createFallbackSourceInfo(imageUrl: string): ImageSourceInfo | null {
  const imagePath = extractS3PathFromUrl(imageUrl);
  if (!imagePath) {
    return null;
  }

  return {
    source_type: 'unknown',
    source_id: `fallback-${Date.now()}`, // Generate a unique ID
    image_path: imagePath,
    display_name: `Image ${new Date().toLocaleDateString('ja-JP')}`,
  };
}

/**
 * Auto-detect source info based on URL patterns and context
 * SOLID: Single responsibility for automatic source detection
 */
export function detectSourceInfo(
  imageUrl: string,
  context?: {
    type?: 'character' | 'item' | 'generated_reference' | 'conversation';
    id?: string;
    name?: string;
    messageId?: number;
    messageMetadata?: Record<string, unknown>;
  },
): ImageSourceInfo | null {
  if (!context) {
    return createFallbackSourceInfo(imageUrl);
  }

  switch (context.type) {
    case 'character':
      return context.id ? createCharacterSourceInfo(context.id, imageUrl, context.name) : null;

    case 'item':
      return context.id ? createItemSourceInfo(context.id, imageUrl, context.name) : null;

    case 'generated_reference':
      return context.id ? createGeneratedReferenceSourceInfo(context.id, imageUrl, context.name) : null;

    case 'conversation':
      return inferSourceInfoFromConversation(imageUrl, context.messageId, context.messageMetadata);

    default:
      return createFallbackSourceInfo(imageUrl);
  }
}
