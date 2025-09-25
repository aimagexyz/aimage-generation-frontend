import { useCallback, useEffect, useRef } from 'react';

export interface KeyboardShortcutConfig {
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  action: () => void;
  description: string;
  category?: string;
  disabled?: boolean;
}

export interface UnifiedKeyboardShortcutsOptions {
  // Core navigation
  onNavigateUp?: () => void;
  onNavigateDown?: () => void;
  onSelect?: () => void;
  onEscape?: () => void;

  // Management actions
  onCreate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRefresh?: () => void;

  // Bulk operations
  onSelectAll?: () => void;
  onDeselectAll?: () => void;
  onBulkDelete?: () => void;

  // Search and filters
  onFocusSearch?: () => void;
  onClearSearch?: () => void;
  onToggleFilters?: () => void;

  // Custom shortcuts
  customShortcuts?: KeyboardShortcutConfig[];

  // Options
  enabled?: boolean;
  category?: string; // For help documentation
}

export interface UnifiedKeyboardShortcutsReturn {
  shortcuts: KeyboardShortcutConfig[];
  handleKeyDown: (event: KeyboardEvent) => void;
  isShortcutActive: (key: string) => boolean;
  getShortcutDescription: (key: string) => string | undefined;
}

const noop = () => {};

/**
 * Unified keyboard shortcuts hook for consistent navigation across management tabs
 */
export function useUnifiedKeyboardShortcuts({
  onNavigateUp,
  onNavigateDown,
  onSelect,
  onEscape,
  onCreate,
  onEdit,
  onDelete,
  onRefresh,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onFocusSearch,
  onClearSearch,
  onToggleFilters,
  customShortcuts = [],
  enabled = true,
}: UnifiedKeyboardShortcutsOptions): UnifiedKeyboardShortcutsReturn {
  const activeShortcutsRef = useRef<Set<string>>(new Set());

  // Define standard shortcuts
  const standardShortcuts: KeyboardShortcutConfig[] = [
    // Navigation
    {
      key: 'ArrowUp',
      action: onNavigateUp || noop,
      description: '上のアイテムに移動',
      category: 'Navigation',
      disabled: !onNavigateUp,
    },
    {
      key: 'ArrowDown',
      action: onNavigateDown || noop,
      description: '下のアイテムに移動',
      category: 'Navigation',
      disabled: !onNavigateDown,
    },
    {
      key: 'Enter',
      action: onSelect || noop,
      description: 'アイテムを選択',
      category: 'Navigation',
      disabled: !onSelect,
    },
    {
      key: 'Escape',
      action: onEscape || noop,
      description: 'キャンセル/閉じる',
      category: 'Navigation',
      disabled: !onEscape,
    },

    // Management actions
    {
      key: 'n',
      ctrlKey: true,
      action: onCreate || noop,
      description: '新規作成',
      category: 'Management',
      disabled: !onCreate,
    },
    {
      key: 'e',
      ctrlKey: true,
      action: onEdit || noop,
      description: '編集',
      category: 'Management',
      disabled: !onEdit,
    },
    {
      key: 'Delete',
      action: onDelete || noop,
      description: '削除',
      category: 'Management',
      disabled: !onDelete,
    },
    {
      key: 'r',
      ctrlKey: true,
      action: onRefresh || noop,
      description: '更新',
      category: 'Management',
      disabled: !onRefresh,
    },

    // Bulk operations
    {
      key: 'a',
      ctrlKey: true,
      action: onSelectAll || noop,
      description: '全選択',
      category: 'Bulk Operations',
      disabled: !onSelectAll,
    },
    {
      key: 'a',
      ctrlKey: true,
      shiftKey: true,
      action: onDeselectAll || noop,
      description: '全選択解除',
      category: 'Bulk Operations',
      disabled: !onDeselectAll,
    },
    {
      key: 'Delete',
      ctrlKey: true,
      action: onBulkDelete || noop,
      description: '選択アイテムを一括削除',
      category: 'Bulk Operations',
      disabled: !onBulkDelete,
    },

    // Search and filters
    {
      key: 'f',
      ctrlKey: true,
      action: onFocusSearch || noop,
      description: '検索フォーカス',
      category: 'Search & Filters',
      disabled: !onFocusSearch,
    },
    {
      key: 'Escape',
      action: onClearSearch || noop,
      description: '検索クリア',
      category: 'Search & Filters',
      disabled: !onClearSearch,
    },
    {
      key: 'f',
      ctrlKey: true,
      shiftKey: true,
      action: onToggleFilters || noop,
      description: 'フィルター表示切替',
      category: 'Search & Filters',
      disabled: !onToggleFilters,
    },
  ];

  // Combine standard and custom shortcuts
  const allShortcuts = [...standardShortcuts, ...customShortcuts].filter((shortcut) => !shortcut.disabled);

  // Create keyboard event handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) {
        return;
      }

      // Don't handle shortcuts when user is typing in inputs
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        // Allow escape key to blur inputs
        if (event.key === 'Escape') {
          target.blur();
        }
        return;
      }

      // Find matching shortcut
      const matchingShortcut = allShortcuts.find((shortcut) => {
        const keyMatches = shortcut.key === event.key;
        const metaMatches = !!shortcut.metaKey === event.metaKey;
        const ctrlMatches = !!shortcut.ctrlKey === event.ctrlKey;
        const altMatches = !!shortcut.altKey === event.altKey;
        const shiftMatches = !!shortcut.shiftKey === event.shiftKey;

        return keyMatches && metaMatches && ctrlMatches && altMatches && shiftMatches;
      });

      if (matchingShortcut) {
        event.preventDefault();
        event.stopPropagation();

        // Track active shortcut
        activeShortcutsRef.current.add(matchingShortcut.key);

        // Execute action
        matchingShortcut.action();

        // Remove from active shortcuts after a short delay
        setTimeout(() => {
          activeShortcutsRef.current.delete(matchingShortcut.key);
        }, 200);
      }
    },
    [enabled, allShortcuts],
  );

  // Set up global keyboard event listener
  useEffect(() => {
    if (!enabled) {
      return;
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);

  // Helper functions
  const isShortcutActive = useCallback((key: string) => {
    return activeShortcutsRef.current.has(key);
  }, []);

  const getShortcutDescription = useCallback(
    (key: string) => {
      const shortcut = allShortcuts.find((s) => s.key === key);
      return shortcut?.description;
    },
    [allShortcuts],
  );

  return {
    shortcuts: allShortcuts,
    handleKeyDown,
    isShortcutActive,
    getShortcutDescription,
  };
}

/**
 * Helper function to format keyboard shortcut display
 */
export function formatKeyboardShortcut(shortcut: KeyboardShortcutConfig): string {
  const parts: string[] = [];

  if (shortcut.metaKey) {
    parts.push('⌘');
  }
  if (shortcut.ctrlKey) {
    parts.push('Ctrl');
  }
  if (shortcut.altKey) {
    parts.push('Alt');
  }
  if (shortcut.shiftKey) {
    parts.push('Shift');
  }

  // Format key display
  let keyDisplay: string;
  switch (shortcut.key) {
    case 'ArrowUp': {
      keyDisplay = '↑';
      break;
    }
    case 'ArrowDown': {
      keyDisplay = '↓';
      break;
    }
    case 'ArrowLeft': {
      keyDisplay = '←';
      break;
    }
    case 'ArrowRight': {
      keyDisplay = '→';
      break;
    }
    case 'Enter': {
      keyDisplay = '⏎';
      break;
    }
    case 'Escape': {
      keyDisplay = 'Esc';
      break;
    }
    case 'Delete': {
      keyDisplay = 'Del';
      break;
    }
    case ' ': {
      keyDisplay = 'Space';
      break;
    }
    default: {
      keyDisplay = shortcut.key.toUpperCase();
    }
  }

  parts.push(keyDisplay);

  return parts.join(' + ');
}

/**
 * Helper function to group shortcuts by category
 */
export function groupShortcutsByCategory(
  shortcuts: KeyboardShortcutConfig[],
): Record<string, KeyboardShortcutConfig[]> {
  return shortcuts.reduce(
    (groups, shortcut) => {
      const category = shortcut.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(shortcut);
      return groups;
    },
    {} as Record<string, KeyboardShortcutConfig[]>,
  );
}
