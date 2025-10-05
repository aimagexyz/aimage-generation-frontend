import type { CharacterDetail } from '@/api/charactersService';
import type { ReviewSetRecommendation } from '@/api/recommendationsService';
import type { AiReviewMode } from '@/types/aiReview';
import type { Rpd } from '@/types/ReviewPointDefinition';
import type { ReviewSetOut } from '@/types/ReviewSet';

// 统一的选择项类型
export interface ReviewItem {
  id: string;
  name: string;
  description?: string;
  type: 'review_set' | 'rpd';
  isRecommended?: boolean;
  recommendationScore?: number;
  matchedTags?: string[];
  matchedCharacters?: string[];
}

// 选择状态
export interface ReviewSelection {
  rpdIds: string[];
  reviewSetIds: string[];
  mode: AiReviewMode;
}

// 增强的推荐项
export interface EnhancedRecommendation extends ReviewSetRecommendation {
  review_set: ReviewSetOut;
}

// 统一Modal的Props
export interface UnifiedReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selection: ReviewSelection) => Promise<void>;
  taskId: string;
  projectId: string;
  isProcessing?: boolean;
  selectedCharacter?: CharacterDetail | null;
  // 区分初期监修和再监修
  mode: 'initial' | 'rerun';
  // 初期监修时的默认模式
  defaultMode?: AiReviewMode;
}

// 选择栏Props
export interface SelectionBarProps {
  selectedItems: ReviewItem[];
  onRemove: (itemId: string) => void;
  onClear: () => void;
  onStartReview: () => void;
  isProcessing?: boolean;
  mode: AiReviewMode;
  onModeChange: (mode: AiReviewMode) => void;
}

// 推荐区域Props
export interface RecommendationSectionProps {
  recommendations: EnhancedRecommendation[];
  selectedItems: ReviewItem[];
  onSelect: (item: ReviewItem) => void;
  isLoading?: boolean;
}

// 快速添加区域Props
export interface QuickAddSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  reviewSets: ReviewSetOut[];
  rpds: Rpd[];
  selectedItems: ReviewItem[];
  onSelect: (item: ReviewItem) => void;
  isLoading?: boolean;
}
