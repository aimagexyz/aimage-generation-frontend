import { memo } from 'react';

import { Badge } from '@/components/ui/Badge';

function TagBadgeComponent({
  icon: Icon,
  label,
  value,
  variant = 'secondary',
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  variant?: 'secondary' | 'outline';
  description?: string;
}) {
  return (
    <div className="relative group">
      <Badge
        variant={variant}
        className={`
        flex items-center gap-1.5 px-3 py-1.5 font-medium transition-all duration-200 hover:scale-105
        ${
          variant === 'secondary'
            ? 'bg-gradient-to-r from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-600 shadow-sm'
            : 'border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm'
        }
      `}
      >
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs font-semibold">{label}</span>
        <span className="text-xs font-bold">{value}</span>
      </Badge>
      {description && (
        <div className="absolute z-10 px-2 py-1 mb-2 text-xs text-white transition-opacity duration-200 transform -translate-x-1/2 rounded opacity-0 bottom-full left-1/2 bg-slate-900 group-hover:opacity-100 whitespace-nowrap">
          {description}
        </div>
      )}
    </div>
  );
}

export const TagBadge = memo(TagBadgeComponent);
TagBadge.displayName = 'TagBadge';
