import { GeneratedReferenceResponse } from '../hooks/useGeneratedImages';

export interface FilterState {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  selectedTags: string[];
  searchQuery: string;
}

export function filterImages(images: GeneratedReferenceResponse[], filters: FilterState): GeneratedReferenceResponse[] {
  return images.filter((img) => {
    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      const imgDate = new Date(img.created_at);
      if (filters.dateRange.start && imgDate < filters.dateRange.start) {
        return false;
      }
      if (filters.dateRange.end) {
        // Set end date to end of day (23:59:59)
        const endOfDay = new Date(filters.dateRange.end);
        endOfDay.setHours(23, 59, 59, 999);
        if (imgDate > endOfDay) {
          return false;
        }
      }
    }

    // Tag filter (AND logic - must have all selected tags)
    if (filters.selectedTags.length > 0) {
      const imgTags = Object.values(img.tags).filter((tag): tag is string => typeof tag === 'string');
      const hasAllTags = filters.selectedTags.every((tag) => imgTags.includes(tag));
      if (!hasAllTags) {
        return false;
      }
    }

    // Search query filter (case-insensitive, searches in both prompts)
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const matchPrompt =
        img.base_prompt.toLowerCase().includes(query) || img.enhanced_prompt.toLowerCase().includes(query);
      if (!matchPrompt) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Extract all unique tag values from a list of images
 */
export function extractAvailableTags(images: GeneratedReferenceResponse[]): string[] {
  const tagSet = new Set<string>();
  images.forEach((img) => {
    Object.values(img.tags).forEach((tag) => {
      if (tag && typeof tag === 'string') {
        tagSet.add(tag);
      }
    });
  });
  return Array.from(tagSet).sort((a, b) => a.localeCompare(b));
}

/**
 * Get count of images for each tag
 */
export function getTagCounts(images: GeneratedReferenceResponse[]): Record<string, number> {
  const counts: Record<string, number> = {};
  images.forEach((img) => {
    Object.values(img.tags).forEach((tag) => {
      if (tag && typeof tag === 'string') {
        counts[tag] = (counts[tag] || 0) + 1;
      }
    });
  });
  return counts;
}
