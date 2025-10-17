import { AlertCircle, Image, RefreshCw, Sparkles, TrendingUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';

import { ActiveFilters } from './components/ActiveFilters';
import { FilterPanel } from './components/FilterPanel';
import { ImageDetailModal } from './components/ImageDetailModal';
import { ImageGallery } from './components/ImageGallery';
import { GeneratedReferenceResponse, useGeneratedImages } from './hooks/useGeneratedImages';
import { extractAvailableTags, filterImages, FilterState, getTagCounts } from './utils/filterImages';

export default function GeneratedImagesReview() {
  const { projectId } = useParams<{ projectId: string }>();
  const [filters, setFilters] = useState<FilterState>({
    dateRange: { start: null, end: null },
    selectedTags: [],
    searchQuery: '',
  });
  const [selectedImage, setSelectedImage] = useState<GeneratedReferenceResponse | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: images, isLoading, error, refetch } = useGeneratedImages(projectId || '');

  // Extract available tags and counts from all images
  const availableTags = useMemo(() => {
    return images ? extractAvailableTags(images) : [];
  }, [images]);

  const tagCounts = useMemo(() => {
    return images ? getTagCounts(images) : {};
  }, [images]);

  // Apply filters to images
  const filteredImages = useMemo(() => {
    if (!images) {
      return [];
    }
    return filterImages(images, filters);
  }, [images, filters]);

  const handleImageClick = (image: GeneratedReferenceResponse) => {
    setSelectedImage(image);
    setModalOpen(true);
  };

  const handleModalClose = () => {
    setModalOpen(false);
    setSelectedImage(null);
  };

  const handleRemoveTag = (tag: string) => {
    setFilters({
      ...filters,
      selectedTags: filters.selectedTags.filter((t) => t !== tag),
    });
  };

  const handleClearDateRange = () => {
    setFilters({ ...filters, dateRange: { start: null, end: null } });
  };

  const handleClearSearch = () => {
    setFilters({ ...filters, searchQuery: '' });
  };

  const handleClearAllFilters = () => {
    setFilters({
      dateRange: { start: null, end: null },
      selectedTags: [],
      searchQuery: '',
    });
  };

  const hasActiveFilters = !!(
    filters.dateRange.start ||
    filters.dateRange.end ||
    filters.selectedTags.length > 0 ||
    filters.searchQuery
  );

  // Calculate stats
  const stats = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentCount = images?.filter((img) => new Date(img.created_at) >= weekAgo).length || 0;

    return {
      total: images?.length || 0,
      recent: recentCount,
      filtered: filteredImages.length,
    };
  }, [images, filteredImages]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gradient-to-b from-background to-muted/20">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Title & Stats in one row */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold">生成画像一覧</h1>
                <p className="text-xs text-muted-foreground">AI生成画像をすべて閲覧・確認</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => void refetch()} disabled={isLoading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </Button>
            </div>
          </div>

          {/* Compact Filter Row */}
          {!error && (
            <div className="mt-3 space-y-2">
              <FilterPanel
                filters={filters}
                onFiltersChange={setFilters}
                availableTags={availableTags}
                tagCounts={tagCounts}
                resultCount={filteredImages.length}
                totalCount={images?.length || 0}
              />

              {/* Active Filters */}
              <ActiveFilters
                filters={filters}
                onRemoveTag={handleRemoveTag}
                onClearDateRange={handleClearDateRange}
                onClearSearch={handleClearSearch}
                onClearAll={handleClearAllFilters}
              />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>読み込みに失敗しました</AlertTitle>
              <AlertDescription className="flex items-center justify-between">
                <span>生成画像を読み込めませんでした。再試行してください。</span>
                <Button variant="outline" size="sm" onClick={() => void refetch()}>
                  再試行
                </Button>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>

      {/* Main Content - Scrollable Gallery (80% space) */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-6">
          {!error && (
            <ImageGallery
              images={filteredImages}
              isLoading={isLoading}
              isFiltered={hasActiveFilters}
              onImageClick={handleImageClick}
            />
          )}
        </div>
      </div>

      {/* Detail Modal */}
      <ImageDetailModal image={selectedImage} open={modalOpen} onClose={handleModalClose} />
    </div>
  );
}
