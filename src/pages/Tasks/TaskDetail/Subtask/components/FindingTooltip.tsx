import React from 'react';

interface AiReviewFinding {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'risk' | 'alert' | 'safe';
  suggestion?: string;
}

interface FindingTooltipProps {
  finding: AiReviewFinding;
  isEditable: boolean;
  isEditing: boolean;
}

export function FindingTooltip({ finding, isEditable, isEditing }: FindingTooltipProps): React.ReactElement {
  return (
    <>
      <p className="text-xs font-semibold mb-0.5">
        {`Severity: ${finding.severity.charAt(0).toUpperCase() + finding.severity.slice(1)}`}
      </p>
      <p className="mb-1 text-xs">{finding.description}</p>
      {finding.suggestion && <p className="text-xs italic text-muted-foreground">Suggestion: {finding.suggestion}</p>}
      {isEditable && !isEditing && <p className="text-xs text-blue-600 mt-1">双击で編集モードに入る</p>}
      {isEditing && <p className="text-xs text-blue-600 mt-1">ESCキー または 外部クリック で保存</p>}
    </>
  );
}
