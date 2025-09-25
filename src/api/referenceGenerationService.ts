import { fetchApi } from '@/api/client';
import { type UrlPaths } from '@/api/helper';

// Types matching backend schemas
export interface GenerationTags {
  style?: string;
  pose?: string;
  camera?: string;
  lighting?: string;
}

export interface GenerateRequest {
  base_prompt: string;
  tags: GenerationTags;
  count: number;
  aspect_ratio: string;
  negative_prompt?: string;
}

export interface GeneratedReferenceResponse {
  id: string;
  base_prompt: string;
  enhanced_prompt: string;
  tags: Record<string, string>;
  image_url: string;
  image_path: string; // S3 path for liked images functionality
  created_at: string;
}

// API Service
export const referenceGenerationService = {
  /**
   * Generate character references
   */
  async generateReferences(projectId: string, request: GenerateRequest): Promise<GeneratedReferenceResponse[]> {
    const response = await fetchApi({
      url: `/api/v1/reference-generation/projects/${projectId}/generate` as UrlPaths,
      method: 'post',
      data: request,
    });
    return response.data as GeneratedReferenceResponse[];
  },

  /**
   * List generated references for a project
   */
  async listReferences(projectId: string): Promise<GeneratedReferenceResponse[]> {
    const response = await fetchApi({
      url: `/api/v1/reference-generation/projects/${projectId}/references` as UrlPaths,
      method: 'get',
    });
    return response.data as GeneratedReferenceResponse[];
  },
};

// Mapping functions to reduce complexity
const mapToStyle = (value: string): string => {
  if (value.includes('アニメ') || value.includes('anime')) {
    return 'anime';
  }
  if (value.includes('リアル') || value.includes('realistic')) {
    return 'realistic';
  }
  if (value.includes('ちび') || value.includes('chibi')) {
    return 'chibi';
  }
  return 'cartoon';
};

const mapToPose = (value: string): string => {
  if (value.includes('立ち') || value.includes('standing')) {
    return 'standing';
  }
  if (value.includes('座') || value.includes('sitting')) {
    return 'sitting';
  }
  if (value.includes('アクション') || value.includes('action')) {
    return 'action';
  }
  return 'portrait';
};

const mapToCamera = (value: string): string => {
  if (value.includes('顔') || value.includes('close')) {
    return 'close-up';
  }
  if (value.includes('全身') || value.includes('full')) {
    return 'full-body';
  }
  if (value.includes('バスト') || value.includes('portrait')) {
    return 'portrait';
  }
  return 'wide-shot';
};

// Helper function to map existing DetailedSettings to new API format
export const mapSettingsToRequest = (
  basePrompt: string,
  detailedSettings: { number_of_images: number; aspect_ratio: string },
  structuredSelections: Record<string, string>,
  negativePrompt?: string,
): GenerateRequest => {
  const tags: GenerationTags = {};

  // Extract relevant tags from structured selections
  Object.entries(structuredSelections).forEach(([category, value]) => {
    if (category.includes('clothing-theme') || category.includes('basic-')) {
      tags.style = mapToStyle(value);
    } else if (category.includes('pose-')) {
      tags.pose = mapToPose(value);
    } else if (category.includes('composition')) {
      tags.camera = mapToCamera(value);
    }
  });

  return {
    base_prompt: basePrompt,
    tags,
    count: detailedSettings.number_of_images,
    aspect_ratio: detailedSettings.aspect_ratio,
    negative_prompt: negativePrompt,
  };
};
