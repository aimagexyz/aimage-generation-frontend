import { Check, Lightbulb, Loader2, Package, Star } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card';
import type { RecommendationSectionProps, ReviewItem } from '@/types/UnifiedReview';

export function RecommendationSection({
  recommendations,
  selectedItems,
  onSelect,
  isLoading = false,
}: RecommendationSectionProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">レコメンド</h3>
        </div>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2 text-sm text-muted-foreground">推荐内容を読み込み中...</span>
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">レコメンド</h3>
        </div>
        <div className="py-8 text-center">
          <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">このタスクに基づく推荐はありません</p>
          <p className="text-xs text-muted-foreground mt-1">下の検索セクションから手動で選択してください</p>
        </div>
      </div>
    );
  }

  const handleSelectRecommendation = (recommendation: (typeof recommendations)[0]) => {
    const item: ReviewItem = {
      id: recommendation.review_set_id,
      name: recommendation.review_set_name,
      description: recommendation.review_set.description || undefined,
      type: 'review_set',
      isRecommended: true,
      recommendationScore: recommendation.score,
      matchedTags: recommendation.tag_matches,
      matchedCharacters: recommendation.character_matches,
    };
    onSelect(item);
  };

  const isItemSelected = (recommendationId: string) => {
    return selectedItems.some((item) => item.type === 'review_set' && item.id === recommendationId);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-amber-500" />
          <h3 className="text-lg font-semibold">レコメンド</h3>
          <Badge variant="secondary" className="text-xs">
            {recommendations.length}件
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">タスクの角色とタグに基づいて推荐</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-80 overflow-y-auto pr-2">
        {recommendations.map((recommendation) => {
          const isSelected = isItemSelected(recommendation.review_set_id);
          const rpdCount = recommendation.review_set.rpds?.length || 0;

          return (
            <Card
              key={recommendation.review_set_id}
              className={`cursor-pointer transition-all hover:bg-accent/50 relative ${
                isSelected ? 'border-primary bg-primary/5' : ''
              }`}
              onClick={() => !isSelected && handleSelectRecommendation(recommendation)}
            >
              {/* Recommendation Badge */}
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className="text-xs bg-amber-50 border-amber-200 text-amber-700">
                  <Star className="h-3 w-3 mr-1" />
                  {recommendation.score.toFixed(1)}
                </Badge>
              </div>

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between pr-16">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base font-medium truncate flex items-center gap-2">
                      <Package className="h-4 w-4 flex-shrink-0" />
                      {recommendation.review_set_name}
                    </CardTitle>
                    {recommendation.review_set.description && (
                      <CardDescription className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {recommendation.review_set.description}
                      </CardDescription>
                    )}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-3">
                  {/* RPD Count */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{rpdCount} レビューポイント</span>
                  </div>

                  {/* Matched Tags and Characters */}
                  <div className="space-y-2">
                    {recommendation.tag_matches.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">マッチしたタグ:</p>
                        <div className="flex flex-wrap gap-1">
                          {recommendation.tag_matches.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs px-2 py-0.5">
                              {tag}
                            </Badge>
                          ))}
                          {recommendation.tag_matches.length > 3 && (
                            <Badge variant="outline" className="text-xs px-2 py-0.5">
                              +{recommendation.tag_matches.length - 3}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}

                    {recommendation.character_matches.length > 0 && (
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">マッチした角色:</p>
                        <div className="flex flex-wrap gap-1">
                          {recommendation.character_matches.slice(0, 2).map((character, index) => (
                            <Badge key={index} variant="secondary" className="text-xs px-2 py-0.5">
                              {character}
                            </Badge>
                          ))}
                          {recommendation.character_matches.length > 2 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5">
                              +{recommendation.character_matches.length - 2}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Selection State */}
                  <div className="flex items-center justify-between pt-2">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span>タグ: {recommendation.tag_score}</span>
                      <span>•</span>
                      <span>角色: {recommendation.character_score}</span>
                    </div>

                    {isSelected ? (
                      <div className="flex items-center gap-1 text-primary text-xs font-medium">
                        <Check className="h-3 w-3" />
                        選択済み
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" className="h-6 text-xs">
                        選択
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
