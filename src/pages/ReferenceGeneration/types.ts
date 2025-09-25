export type Message = {
  id: number;
  type: 'prompt' | 'response';
  text?: string;
  images?: string[];
  aspect_ratio?: string;
  metadata?: {
    jobId?: string;
    timestamp?: number;
    generationTime?: number;
    fullPrompt?: string;
    settings?: {
      number_of_images: number;
      aspect_ratio: string;
    };
    error?: string;
    // Store generated reference metadata for proper source tracking
    generatedReferences?: Array<{
      id: string;
      image_url: string;
      image_path?: string;
      base_prompt: string;
      enhanced_prompt: string;
    }>;
  };
};

// Unified interface for image details that works for both conversation and liked images
export interface ImageDetailData {
  image_url: string;
  image_path?: string;
  display_name?: string;
  source_type: 'conversation' | 'generated_reference' | 'character' | 'item';
  source_id?: string;
  tags?: string[];
  created_at: string;
  // Additional data for conversation images
  base_prompt?: string;
  enhanced_prompt?: string;
  generation_time?: number;
  settings?: {
    number_of_images: number;
    aspect_ratio: string;
    negative_prompt?: string;
  };
}
