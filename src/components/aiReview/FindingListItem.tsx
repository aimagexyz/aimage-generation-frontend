import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

import {
  AiReviewCitationDisplay,
  type AiReviewCitationDisplayProps,
} from '@/components/citations/AiReviewCitationDisplay';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/Card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useUpdateFindingStatus } from '@/hooks/aiReview/useUpdateFindingStatus';
import {
  type AiReviewFindingEntryInDB,
  type FindingStatus,
  FindingStatus as FindingStatusEnum,
  Severity,
} from '@/types/AiReviewFinding';

// 辅助函数：检测是否为空的 bounding box（全为0）
function isEmptyBoundingBox(boundingBox: number[]): boolean {
  return boundingBox.length >= 4 && boundingBox.every((coord) => coord === 0);
}

interface FindingListItemProps {
  finding: AiReviewFindingEntryInDB;
  onViewImageCitation: AiReviewCitationDisplayProps['onViewImageCitation'];
}

const findingStatusOptions = Object.values(FindingStatusEnum).map((status) => ({
  value: status,
  label: status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
}));

export function FindingListItem({ finding, onViewImageCitation }: FindingListItemProps): JSX.Element {
  const [currentStatus, setCurrentStatus] = useState<FindingStatus>(finding.status);
  const [copiedSuggestion, setCopiedSuggestion] = useState(false);
  const updateStatusMutation = useUpdateFindingStatus();

  const handleStatusChange = (newStatus: FindingStatus) => {
    setCurrentStatus(newStatus);
    updateStatusMutation.mutate({
      findingId: finding.id,
      data: {
        status: newStatus,
      },
    });
  };

  const handleCopySuggestion = async () => {
    if (finding.suggestion) {
      try {
        await navigator.clipboard.writeText(finding.suggestion);
        setCopiedSuggestion(true);
        setTimeout(() => setCopiedSuggestion(false), 2000);
      } catch (err) {
        console.error('Failed to copy text: ', err);
      }
    }
  };

  const getSeverityBadgeVariant = (severityValue: Severity): 'default' | 'secondary' | 'destructive' | 'outline' => {
    switch (severityValue) {
      case Severity.CRITICAL:
      case Severity.HIGH:
        return 'destructive';
      case Severity.MEDIUM:
        return 'secondary';
      case Severity.LOW:
      case Severity.INFORMATIONAL:
        return 'outline';
      default:
        return 'default';
    }
  };

  return (
    <Card className="mb-4 transition-shadow duration-200 shadow-sm hover:shadow-md">
      <CardHeader className="px-4 pt-4 pb-3">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg leading-tight break-all">{finding.description || 'Untitled Finding'}</CardTitle>
          <Badge variant={getSeverityBadgeVariant(finding.severity)} className="ml-3 whitespace-nowrap">
            {finding.severity}
          </Badge>
        </div>
        <CardDescription className="pt-1 text-xs">
          Key: {finding.findingKey} {finding.is_human_override && '(Human Override)'}
        </CardDescription>

        {/* Tag 显示区域 - 移到header部分，更显眼 */}
        {finding.tag && finding.tag.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {finding.tag.map((tag, index) => (
              <Badge key={index} variant="secondary" className="text-xs bg-blue-100 text-blue-800 border-blue-200">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="px-4 pb-3 text-sm">
        {finding.suggestion && (
          <div className="mb-2">
            <div className="flex items-start justify-between gap-2">
              <p className="flex-1">
                <span className="font-semibold">提案:</span> {finding.suggestion}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCopySuggestion()}
                className="flex-shrink-0 h-8 w-8 p-0"
                title="Copy suggestion to clipboard"
              >
                {copiedSuggestion ? <Check className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {finding.citation && (
          <div className="mb-2 text-xs text-gray-600">
            {finding.citation.source_document_id && <p>Source Doc ID: {finding.citation.source_document_id}</p>}
            {typeof finding.citation.page_number === 'number' && <p>Page: {finding.citation.page_number}</p>}
            {finding.citation.text_snippet && <p>Snippet: {finding.citation.text_snippet}</p>}
          </div>
        )}
        <AiReviewCitationDisplay
          referenceImages={finding.reference_images}
          referenceSource={finding.reference_source}
          onViewImageCitation={onViewImageCitation}
        />
        {finding.area && finding.area.bounding_box && !isEmptyBoundingBox(finding.area.bounding_box) && (
          <p className="mt-2 mb-1 text-xs text-gray-600">
            Area: Page {finding.area.page_number || 'N/A'}, Coords: {finding.area.bounding_box.join(', ')}
          </p>
        )}
      </CardContent>
      <CardFooter className="flex items-center justify-between px-4 py-3 border-t bg-slate-50">
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium">Status:</span>
          <Select value={currentStatus} onValueChange={(value) => handleStatusChange(value as FindingStatus)}>
            <SelectTrigger className="w-[180px] h-9 text-xs">
              <SelectValue placeholder="Update status" />
            </SelectTrigger>
            <SelectContent>
              {findingStatusOptions.map((option) => (
                <SelectItem key={option.value} value={option.value} className="text-xs">
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {updateStatusMutation.isPending && <p className="text-xs text-blue-500">Updating...</p>}
        {updateStatusMutation.isError && (
          <p className="text-xs text-red-500">Error: {updateStatusMutation.error?.message}</p>
        )}
      </CardFooter>
    </Card>
  );
}
