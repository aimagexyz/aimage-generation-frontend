import clsx from 'clsx';
import { X } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import type { ReviewSeverity } from './ReviewPanelTypes';
import { getSeverityPillTextAndShortCode, getSeverityStyles } from './ReviewPanelUtils';

// 严重程度药丸组件
interface SeverityPillProps {
  severity: ReviewSeverity;
  showShortCode?: boolean;
  className?: string;
}

export function SeverityPill({ severity, showShortCode = true, className }: SeverityPillProps) {
  const styles = getSeverityStyles(severity);
  const { text, shortCode } = getSeverityPillTextAndShortCode(severity);

  return (
    <span
      className={clsx(
        'inline-flex items-center justify-center px-3 py-1 h-[24px] rounded-full text-xs font-medium',
        styles.pillBgColor,
        styles.pillTextColor,
        className,
      )}
    >
      {text}
      {showShortCode && <span className="ml-1.5 font-semibold">{shortCode}</span>}
    </span>
  );
}

// 计数徽章组件
interface CountBadgeProps {
  count: number;
  className?: string;
}

export function CountBadge({ count, className }: CountBadgeProps) {
  return (
    <span
      className={clsx(
        'flex items-center justify-center w-4 h-4 text-[10px] font-bold text-white bg-gray-700 rounded-full',
        className,
      )}
    >
      {count}
    </span>
  );
}

// 重置按钮组件
interface ResetButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function ResetButton({ onClick, disabled }: ResetButtonProps) {
  return (
    <Button
      variant="link"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="h-auto p-0 text-xs text-blue-500 hover:text-blue-600 disabled:text-muted-foreground disabled:no-underline"
      aria-label="フィルターをリセット"
    >
      <X className="mr-1 size-3" />
      リセット
    </Button>
  );
}
