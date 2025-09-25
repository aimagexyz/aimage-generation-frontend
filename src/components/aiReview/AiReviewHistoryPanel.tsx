import { Alert, AlertDescription, AlertTitle } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useAiReviewHistory } from '@/hooks/aiReview/useAiReviewHistory';
import type { AiReviewSchema } from '@/types/aiReview';

interface AiReviewHistoryPanelProps {
  subtaskId: string | null | undefined;
  onSelectReview: (aiReviewId: string) => void;
  currentReviewId?: string | null;
}

export function AiReviewHistoryPanel({
  subtaskId,
  onSelectReview,
  currentReviewId,
}: AiReviewHistoryPanelProps): JSX.Element {
  const { data: history, isLoading, error } = useAiReviewHistory(subtaskId);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-3/4 mb-2" />
        </CardHeader>
        <CardContent className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Error Loading Review History</AlertTitle>
        <AlertDescription>{error?.message || 'An unexpected error occurred.'}</AlertDescription>
      </Alert>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">No review history found for this subtask.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Review History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {history.map((review: AiReviewSchema) => (
          <Button
            key={review.id}
            variant={review.id === currentReviewId ? 'secondary' : 'outline'}
            className="w-full justify-start text-left h-auto py-2 px-3"
            onClick={() => onSelectReview(review.id)}
          >
            <div className="flex flex-col">
              <span className="font-medium">
                Version: {review.rpd_version_number} (ID: ...{review.id.slice(-6)})
              </span>
              <span className="text-xs text-gray-500">Created: {new Date(review.created_at).toLocaleString()}</span>
              {review.status && (
                <span className={`text-xs ${review.status === 'failed' ? 'text-red-500' : 'text-gray-500'}`}>
                  Status: {review.status}
                </span>
              )}
            </div>
          </Button>
        ))}
      </CardContent>
    </Card>
  );
}
