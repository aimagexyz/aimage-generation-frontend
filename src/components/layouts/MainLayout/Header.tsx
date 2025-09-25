import { LuMoon, LuPackageSearch, LuSun, LuUser } from 'react-icons/lu';
import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/Select';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme'; // Assuming this hook exists or will be created
import { toUUID } from '@/types/common';

import { Navbar } from './Navbar';

export default function Header() {
  const { theme, toggleTheme } = useTheme(); // Assuming useTheme exists
  const { projects, currentProjectId, setCurrentProjectId, userInfo } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const navigateToReferencePage = async (projectId: string) => {
    await navigate(`/projects/${projectId}/reference-generation`);
  };

  const handleProjectChange = async (id: string) => {
    const newProjectId = toUUID(id);
    if (!newProjectId) {
      console.error('Invalid project ID selected');
      return;
    }
    setCurrentProjectId(newProjectId);

    const pathSegments = pathname.split('/');
    const projectIndex = pathSegments.findIndex((segment) => segment === 'projects');

    try {
      if (projectIndex !== -1 && pathSegments.length > projectIndex + 1) {
        const isInOtherProjectScopedPage = pathSegments.length >= projectIndex + 3;

        if (isInOtherProjectScopedPage) {
          await navigateToReferencePage(newProjectId);
        } else {
          pathSegments[projectIndex + 1] = newProjectId;
          const newPath = pathSegments.join('/');
          await navigate(newPath);
        }
      } else {
        await navigate(`/projects/${newProjectId}/reference-generation`);
      }
    } catch (error) {
      console.error('Navigation failed', error);
    }
  };

  return (
    <header className="sticky top-0 z-40 flex h-[60px] items-center justify-between border-b bg-background p-2 md:px-4">
      <div className="flex items-center flex-grow gap-2">
        <img
          src="/aimage_typec.png" // Updated path for the main logo
          alt="Logo"
          className="hidden h-8 md:h-10 aspect-auto sm:block lg:block"
        />
        {!!projects?.items?.length && currentProjectId && (
          <Select onValueChange={(id) => void handleProjectChange(id)} value={`${currentProjectId || ''}`}>
            <SelectTrigger className="w-full max-w-[200px] sm:max-w-[250px] ml-2">
              <div className="flex items-center gap-x-1.5 overflow-hidden">
                <LuPackageSearch size={16} className="flex-shrink-0 text-muted-foreground" />
                <span className="truncate">
                  <SelectValue placeholder="Select Project..." />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent align="start">
              {projects.items.map((project) => (
                <SelectItem key={project.id} value={`${project.id || ''}`}>
                  {project.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Navbar />
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme} // Assuming toggleTheme is part of useTheme
          className="transition-colors duration-300 rounded-full"
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark' ? <LuSun className="w-5 h-5" /> : <LuMoon className="w-5 h-5" />}
        </Button>

        {/* User Menu - Navigate to Account */}
        {userInfo && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // eslint-disable-next-line sonarjs/void-use
              void navigate('/account');
            }}
            title="アカウント"
          >
            <LuUser size={22} />
          </Button>
        )}
      </div>
    </header>
  );
}
