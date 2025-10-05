import { useLocation, useNavigate } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

import { Button } from '@/components/ui/Button';
import { useAuth } from '@/hooks/useAuth';

import { NAV_ITEMS } from './constants';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  label: string;
}

interface NavItemState {
  determinedPath: string;
  isDisabled: boolean;
  isActive: boolean;
  label: string;
}

function getNavItemState(item: NavItem, currentProjectId: string | null | undefined, pathname: string): NavItemState {
  let determinedPath = item.path;
  let isDisabled = false;
  const { name, path, label } = item;

  if (name === 'projects') {
    if (currentProjectId) {
      determinedPath = `/projects/${currentProjectId}`;
    } else {
      isDisabled = true;
    }
  } else if (path.includes('{:projectId}')) {
    if (currentProjectId) {
      determinedPath = path.replace('{:projectId}', currentProjectId.toString());
    } else {
      isDisabled = true;
    }
  }

  let isActive = false;
  if (!isDisabled) {
    if (name === 'projects') {
      isActive = pathname === determinedPath;
    } else if (path.includes('{:projectId}')) {
      isActive = pathname.startsWith(determinedPath);
    } else {
      isActive = pathname.startsWith(determinedPath);
    }
  }
  return { determinedPath, isDisabled, isActive, label };
}

export function Navbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { currentProjectId } = useAuth();

  return (
    <nav className="hidden sm:flex items-center gap-1 md:gap-2">
      {(NAV_ITEMS as NavItem[]).map((item) => {
        // Cast NAV_ITEMS to NavItem[]
        const { name, icon: IconComponent } = item;
        const {
          determinedPath,
          isDisabled,
          isActive,
          label: itemLabel,
        } = getNavItemState(item, currentProjectId, pathname);

        return (
          <Button
            key={name}
            variant="ghost"
            size="sm"
            className={twMerge(
              'flex items-center gap-2 rounded-lg px-2 py-1 md:px-3 md:py-2 text-sm md:text-base',
              isActive && 'bg-muted',
              isDisabled && 'opacity-50 cursor-not-allowed',
            )}
            // eslint-disable-next-line @typescript-eslint/no-misused-promises
            onClick={() => (isDisabled ? undefined : navigate(determinedPath))}
            disabled={isDisabled}
            title={isDisabled ? 'プロジェクトを選択してください' : itemLabel}
          >
            <IconComponent className="h-5 w-5 flex-shrink-0" />
            <span className="hidden md:inline whitespace-nowrap">{itemLabel}</span>
          </Button>
        );
      })}
    </nav>
  );
}
