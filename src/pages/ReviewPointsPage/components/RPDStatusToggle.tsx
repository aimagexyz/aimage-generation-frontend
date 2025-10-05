import { Loader2, Zap, ZapOff } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import { cn } from '@/utils/utils';

// import { Button } from '@/components/ui/Button';
import { useUpdateRPDStatus } from '../hooks/useUpdateRPDStatus';
// Consider adding a Switch component from Shadcn UI if a toggle is preferred over a button.
// import { Switch } from '@/components/ui/switch';
// import { Label } from '@/components/ui/label';

/**
 * Props for the RPDStatusToggle component.
 */
interface RPDStatusToggleProps {
  /** The unique identifier for the RPD */
  rpdId: string;
  /** Whether the RPD is currently active */
  isActive: boolean;
  /** Optional callback for after successful status change */
  onStatusChangeSuccess?: () => void;
  /** Variant of the toggle - 'full' for detailed view, 'compact' for minimal view */
  variant?: 'full' | 'compact';
}

/**
 * Gets the appropriate icon based on loading and active states.
 */
function getStatusIcon(isLoading: boolean, isActive: boolean, iconSize: string) {
  if (isLoading) {
    return <Loader2 className={`${iconSize} text-white animate-spin`} />;
  }

  if (isActive) {
    return <Zap className={`${iconSize} text-white`} />;
  }

  return <ZapOff className={`${iconSize} text-white`} />;
}

/**
 * Gets the appropriate status text based on loading and active states.
 */
function getStatusText(isLoading: boolean, isActive: boolean) {
  if (isLoading) {
    return isActive ? 'Deactivating...' : 'Activating...';
  }

  return isActive ? 'Active' : 'Inactive';
}

/**
 * Gets the appropriate CSS classes for the icon container.
 */
function getIconContainerClasses(isActive: boolean, size: 'small' | 'large') {
  const baseClasses = 'flex items-center justify-center rounded-full transition-all duration-300';
  const sizeClasses = size === 'small' ? 'w-5 h-5' : 'w-8 h-8';
  const colorClasses = isActive
    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
    : 'bg-gradient-to-r from-gray-300 to-gray-400';
  const shadowClasses = size === 'large' && isActive ? 'shadow-lg shadow-emerald-200' : '';

  return cn(baseClasses, sizeClasses, colorClasses, shadowClasses);
}

/**
 * Renders the compact variant of the status toggle.
 */
function CompactStatusToggle({
  rpdId,
  isActive,
  isLoading,
  handleToggleStatus,
}: {
  rpdId: string;
  isActive: boolean;
  isLoading: boolean;
  handleToggleStatus: (checked: boolean) => void;
}) {
  const statusText = getStatusText(isLoading, isActive);
  const statusIcon = getStatusIcon(isLoading, isActive, 'w-3 h-3');
  const iconContainerClasses = getIconContainerClasses(isActive, 'small');
  const labelClasses = cn(
    'text-sm cursor-pointer transition-colors duration-200',
    isActive ? 'text-emerald-700' : 'text-gray-600',
  );

  return (
    <div className="flex items-center space-x-2">
      <div className={iconContainerClasses}>{statusIcon}</div>
      <Switch
        id={`status-toggle-${rpdId}`}
        checked={isActive}
        onCheckedChange={handleToggleStatus}
        disabled={isLoading}
        aria-label={isActive ? 'Deactivate RPD' : 'Activate RPD'}
        className="transition-all duration-300"
      />
      <Label htmlFor={`status-toggle-${rpdId}`} className={labelClasses}>
        {statusText}
      </Label>
    </div>
  );
}

/**
 * Renders the full variant of the status toggle.
 */
function FullStatusToggle({
  rpdId,
  isActive,
  isLoading,
  handleToggleStatus,
}: {
  rpdId: string;
  isActive: boolean;
  isLoading: boolean;
  handleToggleStatus: (checked: boolean) => void;
}) {
  const statusText = getStatusText(isLoading, isActive);
  const statusIcon = getStatusIcon(isLoading, isActive, 'w-4 h-4');
  const iconContainerClasses = getIconContainerClasses(isActive, 'large');

  const labelClasses = cn(
    'text-sm font-semibold cursor-pointer transition-colors duration-200',
    isActive ? 'text-emerald-700' : 'text-gray-600',
  );

  const badgeClasses = cn(
    'text-xs font-medium transition-all duration-300 transform',
    isActive
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'
      : 'bg-gray-100 text-gray-600 border-gray-200 hover:bg-gray-200',
    'group-hover:scale-105',
  );

  const switchClasses = cn(
    'transition-all duration-300 transform',
    'group-hover:scale-110',
    isActive && 'shadow-lg shadow-emerald-200',
  );

  const badgeContent = isLoading ? (
    <span className="flex items-center">
      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
      {isActive ? 'Deactivating' : 'Activating'}
    </span>
  ) : (
    statusText
  );

  return (
    <div className="flex items-center justify-between w-full p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center space-x-3">
        <div className={iconContainerClasses}>{statusIcon}</div>

        <div className="flex flex-col">
          <Label htmlFor={`status-toggle-${rpdId}`} className={labelClasses}>
            {isLoading ? getStatusText(isLoading, isActive) : 'Status'}
          </Label>
          <Badge variant={isActive ? 'default' : 'secondary'} className={badgeClasses}>
            {badgeContent}
          </Badge>
        </div>
      </div>

      <Switch
        id={`status-toggle-${rpdId}`}
        checked={isActive}
        onCheckedChange={handleToggleStatus}
        disabled={isLoading}
        aria-label={isActive ? 'Deactivate RPD' : 'Activate RPD'}
        className={switchClasses}
      />
    </div>
  );
}

/**
 * A beautiful, interactive toggle component for changing RPD status.
 * Features gradient backgrounds, animated icons, and smooth transitions.
 *
 * @param props - The component props
 * @returns The rendered RPD status toggle component
 */
function RPDStatusToggle({
  rpdId,
  isActive,
  onStatusChangeSuccess,
  variant = 'full',
}: RPDStatusToggleProps): JSX.Element {
  const updateStatusMutation = useUpdateRPDStatus();

  /**
   * Handles the toggle status change.
   * @param checked - The new checked state
   */
  const handleToggleStatus = (checked: boolean) => {
    updateStatusMutation.mutate(
      {
        rpdId,
        data: { is_active: checked },
      },
      {
        onSuccess: () => {
          onStatusChangeSuccess?.();
        },
      },
    );
  };

  const isLoading = updateStatusMutation.isPending;

  if (variant === 'compact') {
    return (
      <CompactStatusToggle
        rpdId={rpdId}
        isActive={isActive}
        isLoading={isLoading}
        handleToggleStatus={handleToggleStatus}
      />
    );
  }

  return (
    <FullStatusToggle rpdId={rpdId} isActive={isActive} isLoading={isLoading} handleToggleStatus={handleToggleStatus} />
  );
}

export default RPDStatusToggle;
