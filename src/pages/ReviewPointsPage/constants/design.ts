// Unified Design Constants for ReviewPoints and ReviewSets
// Following modern design principles and maintaining consistency

// Spacing system (based on 4px grid)
export const SPACING = {
  xs: '0.25rem', // 4px
  sm: '0.5rem', // 8px
  md: '0.75rem', // 12px
  lg: '1rem', // 16px
  xl: '1.5rem', // 24px
  '2xl': '2rem', // 32px
  '3xl': '3rem', // 48px
  '4xl': '4rem', // 64px
} as const;

// Layout dimensions
export const LAYOUT = {
  // Panel widths
  listPanel: {
    width: '480px',
    minWidth: '400px',
    maxWidth: '600px',
  },

  // Content spacing
  contentPadding: {
    x: '1.5rem', // 24px
    y: '1rem', // 16px
  },

  // Border radius
  borderRadius: {
    sm: '0.375rem', // 6px
    md: '0.5rem', // 8px
    lg: '0.75rem', // 12px
    xl: '1rem', // 16px
  },

  // Item heights
  listItem: {
    compact: '3.5rem', // 56px
    normal: '4rem', // 64px
    expanded: '5rem', // 80px
  },

  // Header heights
  header: {
    compact: '3rem', // 48px
    normal: '4rem', // 64px
    tall: '5rem', // 80px
  },
} as const;

// Typography scale
export const TYPOGRAPHY = {
  // Font sizes
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights
  lineHeight: {
    tight: '1.25',
    normal: '1.5',
    relaxed: '1.75',
  },
} as const;

// Color system (semantic colors that work with theme)
export const COLORS = {
  // Status colors
  status: {
    active: {
      bg: 'emerald-50',
      border: 'emerald-300',
      text: 'emerald-700',
      hover: 'emerald-100',
    },
    inactive: {
      bg: 'gray-50',
      border: 'gray-300',
      text: 'gray-600',
      hover: 'gray-100',
    },
  },

  // Selection states
  selection: {
    selected: {
      bg: 'primary/10',
      border: 'primary/50',
      ring: 'primary/20',
    },
    bulk: {
      bg: 'accent/30',
      border: 'primary/30',
    },
  },

  // Interactive states
  interactive: {
    hover: {
      bg: 'muted/50',
      border: 'border',
    },
    focus: {
      ring: 'ring',
      offset: 'ring-offset-2',
    },
  },
} as const;

// Shadow system
export const SHADOWS = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
} as const;

// Z-index system
export const Z_INDEX = {
  dropdown: 50,
  modal: 100,
  toast: 150,
  tooltip: 200,
} as const;

// Component-specific constants
export const COMPONENTS = {
  // List item styling
  listItem: {
    padding: {
      compact: SPACING.md,
      normal: SPACING.lg,
      expanded: SPACING.xl,
    },
    gap: {
      compact: SPACING.sm,
      normal: SPACING.md,
      expanded: SPACING.lg,
    },
    borderRadius: LAYOUT.borderRadius.lg,
  },

  // Card styling
  card: {
    padding: SPACING.lg,
    borderRadius: LAYOUT.borderRadius.md,
    shadow: SHADOWS.sm,
  },

  // Button sizing
  button: {
    height: {
      sm: '2rem', // 32px
      md: '2.25rem', // 36px
      lg: '2.5rem', // 40px
    },
    padding: {
      sm: `${SPACING.sm} ${SPACING.md}`,
      md: `${SPACING.md} ${SPACING.lg}`,
      lg: `${SPACING.lg} ${SPACING.xl}`,
    },
  },

  // Input styling
  input: {
    height: '2.5rem', // 40px
    padding: `${SPACING.md} ${SPACING.lg}`,
    borderRadius: LAYOUT.borderRadius.md,
  },

  // Badge styling
  badge: {
    padding: `${SPACING.xs} ${SPACING.sm}`,
    borderRadius: LAYOUT.borderRadius.sm,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
} as const;

// Responsive breakpoints
export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Animation durations (in seconds)
export const DURATIONS = {
  fast: 0.15,
  normal: 0.2,
  slow: 0.3,
  slower: 0.5,
} as const;

// Common CSS class patterns
export const CSS_PATTERNS = {
  // Flexbox utilities
  flex: {
    center: 'flex items-center justify-center',
    between: 'flex items-center justify-between',
    start: 'flex items-start',
    end: 'flex items-end',
    col: 'flex flex-col',
    colCenter: 'flex flex-col items-center',
  },

  // Grid utilities
  grid: {
    cols2: 'grid grid-cols-2',
    cols3: 'grid grid-cols-3',
    cols4: 'grid grid-cols-4',
    gap: 'gap-4',
    gapSm: 'gap-2',
    gapLg: 'gap-6',
  },

  // Text utilities
  text: {
    truncate: 'truncate',
    ellipsis: 'text-ellipsis overflow-hidden',
    center: 'text-center',
    left: 'text-left',
    right: 'text-right',
  },

  // Common combinations
  listItem: 'flex items-center gap-3 p-4 rounded-lg border transition-all duration-200',
  card: 'rounded-lg border bg-card p-6 shadow-sm',
  button: 'inline-flex items-center justify-center rounded-md font-medium transition-colors',
  input: 'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2',
} as const;

// Feature flags for progressive enhancement
export const FEATURES = {
  enableAnimations: true,
  enableBulkActions: true,
  enableAdvancedFilters: true,
  enableKeyboardShortcuts: true,
  enableAccessibility: true,
} as const;

// Accessibility constants
export const A11Y = {
  // ARIA labels
  labels: {
    search: '検索',
    filter: 'フィルター',
    sort: '並び替え',
    select: '選択',
    selectAll: 'すべて選択',
    deselectAll: '選択解除',
    bulkActions: '一括操作',
    moreActions: 'その他の操作',
  },

  // Keyboard shortcuts
  shortcuts: {
    search: 'Ctrl+F',
    selectAll: 'Ctrl+A',
    escape: 'Escape',
  },

  // Screen reader announcements
  announcements: {
    selected: '選択されました',
    deselected: '選択が解除されました',
    loading: '読み込み中',
    error: 'エラーが発生しました',
    success: '成功しました',
  },
} as const;
