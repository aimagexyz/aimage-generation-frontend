import { AnimatePresence, motion } from 'framer-motion';
import { CheckSquare, ChevronDown, Loader2, Square, X, Zap, ZapOff } from 'lucide-react';

import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/DropdownMenu';
import { Progress } from '@/components/ui/Progress';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/utils/utils';

interface BulkActionBarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onBulkActivate: () => void;
  onBulkDeactivate: () => void;
  isLoading: boolean;
}

/**
 * Enhanced bulk action bar with modern design, animations, and comprehensive accessibility
 */
export default function BulkActionBar({
  selectedCount,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onBulkActivate,
  onBulkDeactivate,
  isLoading,
}: BulkActionBarProps): JSX.Element {
  const allSelected = selectedCount === totalCount && totalCount > 0;
  const someSelected = selectedCount > 0 && selectedCount < totalCount;
  const selectionPercentage = totalCount > 0 ? (selectedCount / totalCount) * 100 : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'border-b bg-gradient-to-r from-primary/5 via-primary/3 to-primary/5',
          'backdrop-blur-sm border-primary/10 overflow-hidden',
          isLoading && 'animate-pulse',
        )}
        role="toolbar"
        aria-label="一括操作ツールバー"
      >
        {/* Selection Progress Bar */}
        <div className="w-full h-1 bg-muted/30 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/80"
            initial={{ width: '0%' }}
            animate={{ width: `${selectionPercentage}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>

        <div className="px-2 sm:px-3 py-2">
          {/* Main content with optimized responsive layout */}
          <div className="flex items-center justify-between gap-1 sm:gap-2 min-w-0">
            {/* Left Section - Selection Info */}
            <div className="flex items-center gap-1 sm:gap-2 min-w-0 flex-1">
              <motion.div
                className="flex items-center gap-1 sm:gap-2 min-w-0"
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.2 }}
              >
                {/* Enhanced Selection Indicator */}
                <div className="relative flex-shrink-0">
                  {(() => {
                    if (someSelected) {
                      return (
                        <motion.div
                          className="h-4 w-4 bg-primary rounded border-2 border-primary flex items-center justify-center shadow-sm"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <div className="h-0.5 w-2 bg-primary-foreground rounded" />
                        </motion.div>
                      );
                    }
                    if (allSelected) {
                      return (
                        <motion.div
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', stiffness: 300 }}
                        >
                          <CheckSquare className="h-4 w-4 text-primary drop-shadow-sm" />
                        </motion.div>
                      );
                    }
                    return <Square className="h-4 w-4 text-muted-foreground" />;
                  })()}
                </div>

                {/* Selection Text - Highly responsive and compact */}
                <div className="text-xs min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold text-foreground whitespace-nowrap">{selectedCount}件</span>
                    <span className="text-muted-foreground whitespace-nowrap hidden sm:inline">/ 全{totalCount}件</span>
                    <span className="text-muted-foreground whitespace-nowrap sm:hidden">/{totalCount}</span>
                  </div>
                </div>
              </motion.div>

              {/* Mode Badge - More compact */}
              <Badge
                variant="secondary"
                className={cn(
                  'bg-primary/10 text-primary border-primary/20 flex-shrink-0',
                  'shadow-sm font-medium px-1.5 py-0.5 text-xs',
                  'animate-in fade-in-0 slide-in-from-left-1 duration-200',
                  'hidden lg:inline-flex',
                )}
              >
                一括
              </Badge>
            </div>

            {/* Right Section - Actions */}
            <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
              {/* Selection Controls - More compact */}
              <Button
                variant="ghost"
                size="sm"
                onClick={allSelected ? onDeselectAll : onSelectAll}
                className={cn(
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-accent/50 transition-all duration-200',
                  'font-medium whitespace-nowrap px-1.5 sm:px-2 h-7',
                  'hidden md:inline-flex',
                )}
                disabled={isLoading}
                aria-label={allSelected ? 'すべてのアイテムの選択を解除' : 'すべてのアイテムを選択'}
              >
                <span className="text-xs">{allSelected ? '全解除' : '全選択'}</span>
              </Button>

              <Separator orientation="vertical" className="h-4 mx-0.5 hidden md:block" />

              {/* Enhanced Bulk Actions */}
              <AnimatePresence>
                {selectedCount > 0 && (
                  <motion.div
                    className="flex items-center gap-0.5 sm:gap-1"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    transition={{ duration: 0.2 }}
                  >
                    {/* Bulk Actions Dropdown - More compact design */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isLoading}
                          className={cn(
                            'bg-background/80 backdrop-blur-sm border-primary/30',
                            'hover:bg-primary/5 hover:border-primary/50',
                            'shadow-sm transition-all duration-200',
                            'font-medium px-1.5 sm:px-2 py-1 h-7 text-xs',
                          )}
                          aria-label={`${selectedCount}件の選択済みRPDに対する一括操作`}
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Zap className="h-3 w-3 mr-1" />
                          )}
                          <span className="hidden sm:inline">操作</span>
                          <span className="sm:hidden">操</span>
                          <span className="ml-0.5 font-mono">({selectedCount})</span>
                          <ChevronDown className="h-2 w-2 ml-0.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        {/* Mobile selection controls */}
                        <div className="md:hidden">
                          <DropdownMenuItem
                            onClick={allSelected ? onDeselectAll : onSelectAll}
                            disabled={isLoading}
                            className="flex items-center gap-2"
                          >
                            {allSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                            {allSelected ? 'すべて解除' : 'すべて選択'}
                          </DropdownMenuItem>
                          <div className="my-1 h-px bg-border" />
                        </div>

                        <DropdownMenuItem
                          onClick={onBulkActivate}
                          disabled={isLoading}
                          className="flex items-center gap-2 text-green-700 focus:text-green-700 focus:bg-green-50"
                        >
                          <Zap className="h-4 w-4" />
                          アクティブ化 ({selectedCount}件)
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={onBulkDeactivate}
                          disabled={isLoading}
                          className="flex items-center gap-2 text-muted-foreground focus:text-muted-foreground focus:bg-muted/50"
                        >
                          <ZapOff className="h-4 w-4" />
                          非アクティブ化 ({selectedCount}件)
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Enhanced Close Button - More compact */}
              <Button
                variant="ghost"
                size="sm"
                onClick={onDeselectAll}
                className={cn(
                  'text-muted-foreground hover:text-foreground',
                  'hover:bg-destructive/10 hover:text-destructive',
                  'transition-all duration-200 ml-0.5 flex-shrink-0',
                  'h-7 w-7 p-0',
                )}
                disabled={isLoading}
                aria-label="一括選択モードを終了"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Enhanced Loading State with Progress */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                className="mt-2 space-y-1"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-primary font-medium">実行中...</span>
                  <span className="text-muted-foreground">{selectedCount}件</span>
                </div>
                <Progress value={undefined} className="h-1 bg-primary/10" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
