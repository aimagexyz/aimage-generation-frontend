import clsx from 'clsx';
import { AlertCircle, Check, Loader2 } from 'lucide-react';
import React from 'react';

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/Tooltip';

interface SaveStatusIconProps {
  saveStatus: 'idle' | 'saving' | 'saved' | 'error';
  isDirty: boolean;
}

export function SaveStatusIcon({ saveStatus, isDirty }: SaveStatusIconProps): React.ReactElement | null {
  if (saveStatus === 'idle' && !isDirty) {
    return null;
  }

  const iconProps = {
    className: 'w-3 h-3',
  };

  let icon;
  let color;
  let tooltip;

  switch (saveStatus) {
    case 'saving':
      icon = <Loader2 {...iconProps} className={clsx(iconProps.className, 'animate-spin')} />;
      color = 'text-blue-600 bg-blue-50';
      tooltip = '保存中...';
      break;
    case 'saved':
      icon = <Check {...iconProps} />;
      color = 'text-green-600 bg-green-50';
      tooltip = '已保存';
      break;
    case 'error':
      icon = <AlertCircle {...iconProps} />;
      color = 'text-red-600 bg-red-50';
      tooltip = '保存失败，将在后台重试';
      break;
    default:
      if (isDirty) {
        icon = <div className="w-2 h-2 bg-orange-500 rounded-full" />;
        color = 'text-orange-600 bg-orange-50';
        tooltip = '有未保存的修改';
      }
      break;
  }

  if (!icon) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={clsx(
              'absolute -top-1 -right-1 w-5 h-5 rounded-full border border-white shadow-sm flex items-center justify-center',
              color,
            )}
          >
            {icon}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
