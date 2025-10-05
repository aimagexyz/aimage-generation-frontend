import { useDebouncedValue } from '@mantine/hooks';
import { useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useLayoutStore } from '@/hooks/useLayoutStore';

import { NAV_ITEMS } from '../constants';

type Props = { item: (typeof NAV_ITEMS)[number] };

function removeLastUUID(path: string) {
  // 使用正则表达式匹配 UUID 并移除
  return path.replace(/\/[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/, '');
}

export function NavItem(props: Props) {
  const { item } = props;
  const { pathname } = useLocation();
  const { currentProjectId } = useAuth();

  const { isSidebarCollapsed } = useLayoutStore();
  const [isSidebarCollapsedDebounced] = useDebouncedValue(isSidebarCollapsed, 150);

  const url = useMemo(() => {
    return item.path.replace('{:projectId}', currentProjectId?.toString() || '');
  }, [currentProjectId, item.path]);

  const isActive = useMemo(() => {
    const noIdPath = removeLastUUID(pathname);
    if (item.path === noIdPath) {
      return true;
    }
    const reg = new RegExp('^' + item.path.replace(/{:.*?}/, '.*?') + '$');
    return reg.test(noIdPath);
  }, [item.path, pathname]);

  return (
    <Tooltip key={item.name} delayDuration={0} open={isSidebarCollapsed ? undefined : false}>
      <TooltipTrigger asChild>
        <Link
          to={url}
          className={twMerge(
            'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200 group relative',
            isActive ? 'bg-accent text-accent-foreground shadow-sm' : 'text-muted-foreground',
            isSidebarCollapsed && 'justify-center',
            // Disable unimplemented links
            item.path.includes('#')
              ? 'cursor-not-allowed opacity-40 pointer-events-none'
              : 'hover:scale-[1.02] hover:bg-accent hover:text-accent-foreground hover:shadow-sm',
          )}
        >
          <item.icon className={twMerge('w-4 h-4 shrink-0 transition-transform', isActive && 'text-primary')} />
          {!isSidebarCollapsed && !isSidebarCollapsedDebounced && (
            <span className={twMerge('transition-opacity', isActive && 'font-semibold')}>{item.label}</span>
          )}
          <div
            className={twMerge(
              isActive && !isSidebarCollapsed ? 'absolute' : 'hidden',
              'z-10 left-0 w-1 h-full rounded-r-full bg-primary',
            )}
          />
        </Link>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={10} className="font-medium">
        {item.label}
      </TooltipContent>
    </Tooltip>
  );
}
