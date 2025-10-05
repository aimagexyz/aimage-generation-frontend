import { motion } from 'framer-motion';
import { List, Plus } from 'lucide-react';

import { Button } from '@/components/ui/Button';

import type { ViewState } from '../hooks/useViewState';

interface EmptyStateProps {
  viewState: ViewState;
  onCreateClick: () => void;
  onResetFilters: () => void;
}

export function EmptyState({ viewState, onCreateClick, onResetFilters }: EmptyStateProps) {
  const hasFiltersApplied = viewState.searchQuery || viewState.filterStatus !== 'all';

  return (
    <motion.div
      className="p-8 space-y-6 text-center"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-center w-20 h-20 mx-auto border rounded-full bg-gradient-to-br from-primary/10 to-primary/5 border-primary/10">
        <List className="w-10 h-10 text-primary/60" />
      </div>
      <div className="space-y-3">
        <h3 className="text-xl font-semibold text-foreground">
          {hasFiltersApplied ? 'RPDが見つかりません' : '最初のRPDを作成しましょう'}
        </h3>
        <p className="max-w-md mx-auto text-sm leading-relaxed text-muted-foreground">
          {hasFiltersApplied
            ? 'フィルターや検索条件を調整して、お探しのRPDを見つけてください。すべてのRPDを表示するには、フィルターをクリアしてください。'
            : 'レビューポイント定義を作成して、プロジェクトの品質管理を強化しましょう。効率的なレビュープロセスの基盤を構築できます。'}
        </p>
      </div>
      {!hasFiltersApplied && (
        <Button onClick={onCreateClick} size="lg" className="mt-6">
          <Plus className="w-5 h-5 mr-2" />
          最初のRPDを作成
        </Button>
      )}
      {hasFiltersApplied && (
        <Button variant="outline" onClick={onResetFilters} className="mt-4">
          フィルターをクリア
        </Button>
      )}
    </motion.div>
  );
}
