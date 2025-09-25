import { useDebouncedValue } from '@mantine/hooks';
import { useEffect } from 'react';
import { LuChevronLeft, LuLogIn, LuLogOut, LuMoon, LuSun } from 'react-icons/lu';
import { Link } from 'react-router-dom';
import { twMerge } from 'tailwind-merge';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/Tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useLayoutStore } from '@/hooks/useLayoutStore';
import { useTheme } from '@/hooks/useTheme';

import { NAV_ITEMS, NAV_ITEMS_BOTTOM } from '../constants';
import { NavItem } from './NavItem';

export default function Sidebar() {
  const { isSidebarCollapsed, setSidebarCollapsed } = useLayoutStore();
  const [isSidebarCollapsedDebounced] = useDebouncedValue(isSidebarCollapsed, 150);

  const { userInfo, loading, logout } = useAuth();

  const { theme, toggleTheme } = useTheme();

  // Handle responsive behavior
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSidebarCollapsed(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  return (
    <div
      className={twMerge(
        'fixed left-0 flex h-screen flex-col border-r bg-background/80 backdrop-blur-sm transition-all duration-300 ease-in-out z-50',
        isSidebarCollapsed ? 'w-16' : 'w-64',
        'shadow-lg',
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 border-b h-14 relative">
        <img
          src={isSidebarCollapsed ? '/aimage_typec.png' : '/aimage_icon.png'}
          alt="logo"
          className={twMerge(
            'top-0 left-0 h-8 cursor-pointer dark:invert dark:grayscale w-full hover:opacity-80',
            isSidebarCollapsed ? 'size-8 aspect-square min-w-8' : 'w-32 min-w-32',
          )}
        />

        <Button
          variant="ghost"
          size="icon"
          className={twMerge('size-8 hover:bg-accent', isSidebarCollapsed && 'absolute right-0 w-4')}
          onClick={() => setSidebarCollapsed(!isSidebarCollapsed)}
        >
          <LuChevronLeft
            size={16}
            className={twMerge('size-4 transition-transform duration-300', isSidebarCollapsed && 'rotate-180')}
          />
        </Button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto scrollbar-hide">
        <div className="space-y-1">
          {NAV_ITEMS.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </div>

        <Separator className="my-4" />

        <div className="space-y-1">
          {NAV_ITEMS_BOTTOM.map((item) => (
            <NavItem key={item.name} item={item} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-2 space-y-2 border-t">
        <div className="flex items-center justify-between px-3 py-2">
          {!isSidebarCollapsed && !isSidebarCollapsedDebounced && (
            <span className="text-muted-foreground text-sm">{theme === 'light' ? 'ダークモード' : 'ライトモード'}</span>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="size-8"
            onClick={() => toggleTheme()}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <LuMoon /> : <LuSun />}
          </Button>
        </div>
      </div>
      <div className="p-2 space-y-2 border-t">
        <Tooltip delayDuration={0} open={isSidebarCollapsed ? undefined : false}>
          <TooltipTrigger asChild>
            <Link
              to="/account"
              className={twMerge(
                'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium transition-all duration-200 hover:bg-accent hover:text-accent-foreground text-muted-foreground group',
                isSidebarCollapsed && 'justify-center',
                'hover:scale-[1.02]',
              )}
            >
              {!loading && !!userInfo && (
                <>
                  <Avatar className="size-8 shrink-0 group-hover:text-primary">
                    <AvatarImage alt={`${userInfo?.name || 'User'}`} src={userInfo?.avatarUrl} />
                    <AvatarFallback>{userInfo?.name?.charAt(0) || 'U'}</AvatarFallback>
                  </Avatar>
                  {!isSidebarCollapsed && !isSidebarCollapsedDebounced && (
                    <span className="w-full">{userInfo?.name || 'アカウント'}</span>
                  )}
                  {!isSidebarCollapsed && !isSidebarCollapsedDebounced && (
                    <Button
                      size="xs"
                      variant="ghost"
                      className="text-destructive p-0 m-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (confirm('本当にサインアウトしますか？')) {
                          logout().catch(console.error);
                        }
                      }}
                    >
                      <LuLogOut size={16} className="size-4 mr-2" />
                    </Button>
                  )}
                </>
              )}
              {!loading && !userInfo && (
                <>
                  <LuLogIn size={16} className="size-4 shrink-0" />
                  {!isSidebarCollapsed && <span>サインイン</span>}
                </>
              )}
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={10}>
            {userInfo?.name || 'アカウント'}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
