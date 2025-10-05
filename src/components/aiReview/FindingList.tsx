import type { AiReviewCitationDisplayProps } from '@/components/citations/AiReviewCitationDisplay';
import type { AiReviewFindingEntryInDB } from '@/types/AiReviewFinding';

import { FindingListItem } from './FindingListItem';

interface FindingListProps {
  findings: AiReviewFindingEntryInDB[] | undefined | null;
  onViewImageCitation: AiReviewCitationDisplayProps['onViewImageCitation'];
}

export function FindingList({ findings, onViewImageCitation }: FindingListProps): JSX.Element {
  if (!findings || findings.length === 0) {
    return (
      <div className="px-2 py-4 text-center text-gray-500">
        <p>No findings available for this review.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {findings.map((finding) => (
        <FindingListItem key={finding.id} finding={finding} onViewImageCitation={onViewImageCitation} />
      ))}
    </div>
  );
}
