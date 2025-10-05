import { Link, useParams } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { TooltipProvider } from '@/components/ui/Tooltip';
import { useAuth } from '@/hooks/useAuth';
import { useTabState } from '@/hooks/useTabState';
import { cn } from '@/utils/utils';

import { PageHeader } from './components/PageHeader';
import { ReviewSetManagementTab } from './components/ReviewSetManagementTab';
import { RPDManagementTab } from './components/RPDManagementTab';

/**
 * Enhanced ReviewPointDefinitionsTabContent with modern design system
 * and advanced UX features including drag-and-drop, inline editing, and accessibility
 */

type Params = {
  projectId: string;
};

type Document = {
  id: string;
  file_name: string;
  created_at: string;
};

type Project = {
  id: string;
  created_at: string;
  name: string;
  owner_org: {
    name: string;
  };
  documents?: Document[];
};

function ReviewPointsPage() {
  const { projectId } = useParams<Params>();
  const { projects } = useAuth();

  // Tab state management
  const { setActiveTab, isRPDActive, isReviewSetActive } = useTabState();

  // Compute project and derived values after all hooks
  const project = projects?.items?.find((p) => p.id === projectId) as Project | undefined;

  // Early return after all hooks are called
  if (!project || !projectId) {
    return (
      <div className="container px-4 py-8 mx-auto">
        <p className="pt-4 text-center text-muted-foreground">プロジェクトが見つかりません</p>
        <p className="pt-2 text-center text-muted-foreground">
          選択中のプロジェクトが存在しないか、アクセス権がないか、URLが正しくありません。
        </p>
        <div className="flex justify-center mt-4">
          <Link to="/">
            <Button variant="outline">ホームページへ戻る</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Helper function to render tab content
  const renderTabContent = () => {
    if (!projectId) {
      return null;
    }

    if (isRPDActive) {
      return <RPDManagementTab projectId={projectId} />;
    }

    if (isReviewSetActive) {
      return <ReviewSetManagementTab projectId={projectId} />;
    }

    return null;
  };

  return (
    <div className="container px-4 py-8 mx-auto">
      <TooltipProvider>
        <div
          className="flex flex-col h-full bg-gradient-to-br from-background to-muted/20"
          role="main"
          aria-label="レビューポイント定義管理"
        >
          {/* Page Header */}
          <PageHeader />

          {/* Tab Navigation */}
          <div className="flex border-b border-border/50 bg-background/50">
            <button
              className={cn(
                'px-4 py-2 font-medium transition-colors',
                isRPDActive ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveTab('rpd')}
            >
              レビューポイント定義(RPD)
            </button>
            <button
              className={cn(
                'px-4 py-2 font-medium transition-colors',
                isReviewSetActive
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => setActiveTab('review-set')}
            >
              レビューセット
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
        </div>
      </TooltipProvider>
    </div>
  );
}

export default ReviewPointsPage;
