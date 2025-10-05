import { Check, FileText, Loader2, Package, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import type { QuickAddSectionProps, ReviewItem } from '@/types/UnifiedReview';

export function QuickAddSection({
  searchQuery,
  onSearchChange,
  reviewSets,
  rpds,
  selectedItems,
  onSelect,
  isLoading = false,
}: QuickAddSectionProps) {
  const handleSelectReviewSet = (reviewSet: (typeof reviewSets)[0]) => {
    const item: ReviewItem = {
      id: reviewSet.id,
      name: reviewSet.name,
      description: reviewSet.description || undefined,
      type: 'review_set',
    };
    onSelect(item);
  };

  const handleSelectRPD = (rpd: (typeof rpds)[0]) => {
    const item: ReviewItem = {
      id: rpd.id,
      name: rpd.title || rpd.key,
      description: undefined, // RPDs don't have description in this context
      type: 'rpd',
    };
    onSelect(item);
  };

  const isItemSelected = (id: string, type: 'review_set' | 'rpd') => {
    return selectedItems.some((item) => item.type === type && item.id === id);
  };

  const totalResults = reviewSets.length + rpds.length;
  const hasSearchQuery = searchQuery.trim().length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">検索</h3>
          {hasSearchQuery && (
            <Badge variant="secondary" className="text-xs">
              {totalResults}件見つかりました
            </Badge>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Review Set または Review Point を検索..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">読み込み中...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Review Set Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <h4 className="font-medium">Review Set</h4>
              <Badge variant="outline" className="text-xs">
                {reviewSets.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {reviewSets.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                  {hasSearchQuery ? '該当するReview Setが見つかりません' : 'Review Setがありません'}
                </div>
              ) : (
                reviewSets.map((reviewSet) => {
                  const isSelected = isItemSelected(reviewSet.id, 'review_set');
                  const rpdCount = reviewSet.rpds?.length || 0;

                  return (
                    <Card
                      key={reviewSet.id}
                      className={`cursor-pointer transition-all hover:bg-accent/50 ${
                        isSelected ? 'border-primary bg-primary/5 opacity-60' : ''
                      }`}
                      onClick={() => !isSelected && handleSelectReviewSet(reviewSet)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium truncate flex items-center gap-2">
                              <Package className="h-3 w-3 flex-shrink-0" />
                              {reviewSet.name}
                            </CardTitle>
                            {reviewSet.description && (
                              <CardDescription className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {reviewSet.description}
                              </CardDescription>
                            )}
                          </div>
                          {isSelected ? (
                            <div className="flex items-center gap-1 text-primary text-xs font-medium ml-2">
                              <Check className="h-3 w-3" />
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2">
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{rpdCount} レビューポイント</span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>

          {/* RPD Section */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-green-600" />
              <h4 className="font-medium">Individual RPD</h4>
              <Badge variant="outline" className="text-xs">
                {rpds.length}
              </Badge>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {rpds.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground bg-muted/20 rounded-lg border-2 border-dashed">
                  {hasSearchQuery ? '該当するRPDが見つかりません' : 'RPDがありません'}
                </div>
              ) : (
                rpds.map((rpd) => {
                  const isSelected = isItemSelected(rpd.id, 'rpd');
                  const displayName = rpd.title || rpd.key;

                  return (
                    <Card
                      key={rpd.id}
                      className={`cursor-pointer transition-all hover:bg-accent/50 ${
                        isSelected ? 'border-primary bg-primary/5 opacity-60' : ''
                      }`}
                      onClick={() => !isSelected && handleSelectRPD(rpd)}
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <CardTitle className="text-sm font-medium truncate flex items-center gap-2">
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              {displayName}
                            </CardTitle>
                            {/* RPD descriptions not available in current schema */}
                          </div>
                          {isSelected ? (
                            <div className="flex items-center gap-1 text-primary text-xs font-medium ml-2">
                              <Check className="h-3 w-3" />
                            </div>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 ml-2">
                              <Plus className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>

                      <CardContent className="pt-0">
                        <div className="text-xs text-muted-foreground">Key: {rpd.key}</div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
