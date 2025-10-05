import type { Variants } from 'framer-motion';

// Animation timing constants
export const TIMING = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  stagger: 0.05,
} as const;

// Memoized animation variants for better performance
export const MEMOIZED_VARIANTS = {
  // Pre-computed common animation variants to avoid re-creation
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
  },
  slideUp: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
  },
} as const;

// Easing functions
export const EASING = {
  easeInOut: [0.4, 0, 0.2, 1],
  easeOut: [0, 0, 0.2, 1],
  easeIn: [0.4, 0, 1, 1],
  spring: { type: 'spring', stiffness: 300, damping: 30 },
} as const;

// Unified animation variants
export const UNIFIED_ANIMATIONS = {
  // List item animations
  listItem: {
    initial: { opacity: 0, y: 10, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    exit: { opacity: 0, y: -10, scale: 0.95 },
    transition: { duration: TIMING.normal, ease: EASING.easeOut },
  },

  // Detail panel animations
  detailPanel: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: TIMING.normal, ease: EASING.easeOut },
  },

  // Modal animations
  modal: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: TIMING.fast, ease: EASING.easeOut },
  },

  // Bulk action bar animations
  bulkActionBar: {
    initial: { opacity: 0, y: -10, height: 0 },
    animate: { opacity: 1, y: 0, height: 'auto' },
    exit: { opacity: 0, y: -10, height: 0 },
    transition: { duration: TIMING.normal, ease: EASING.easeInOut },
  },

  // Card hover animations
  cardHover: {
    initial: { scale: 1 },
    hover: { scale: 1.02 },
    tap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 300, damping: 30 },
  },

  // Fade in animations
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: TIMING.normal },
  },

  // Slide in from left
  slideInLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: TIMING.normal, ease: EASING.easeOut },
  },

  // Slide in from right
  slideInRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: TIMING.normal, ease: EASING.easeOut },
  },

  // Scale in animation
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: TIMING.fast, ease: EASING.spring },
  },
} as const;

// Helper function to create staggered animations
export const createStaggeredAnimation = (baseAnimation: Variants, staggerDelay: number = TIMING.stagger) => ({
  ...baseAnimation,
  transition: {
    ...baseAnimation.transition,
    delay: staggerDelay,
  },
});

// Helper function to create custom timing
export const withTiming = (animation: Variants, duration: number) => ({
  ...animation,
  transition: {
    ...animation.transition,
    duration,
  },
});

// Common layout animations
export const LAYOUT_ANIMATIONS = {
  // Panel resize animation
  panelResize: {
    layout: true,
    transition: { duration: TIMING.normal, ease: EASING.easeInOut },
  },

  // Content layout shift
  contentShift: {
    layout: 'position',
    transition: { duration: TIMING.fast, ease: EASING.easeOut },
  },
} as const;

// Accessibility-friendly reduced motion variants
export const REDUCED_MOTION_ANIMATIONS = {
  listItem: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: TIMING.fast },
  },

  detailPanel: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: TIMING.fast },
  },
} as const;

// Framer Motion variants for complex animations
export const LIST_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.1,
    },
  },
};

export const ITEM_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.15,
      ease: 'easeIn',
    },
  },
};

export const PANEL_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    x: -20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: 0.1,
      ease: 'easeOut',
    },
  },
};

export const DETAIL_PANEL_VARIANTS: Variants = {
  hidden: {
    opacity: 0,
    x: 20,
  },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      delay: 0.2,
      ease: 'easeOut',
    },
  },
};

// Animation presets for common use cases
export const ANIMATION_PRESETS = {
  // Quick fade for loading states
  quickFade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.1 },
  },

  // Smooth slide for panels
  smoothSlide: {
    initial: { opacity: 0, x: -30 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -30 },
    transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] },
  },

  // Gentle bounce for interactions
  gentleBounce: {
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { type: 'spring', stiffness: 400, damping: 17 },
  },

  // Emphasis animation for important actions
  emphasis: {
    animate: {
      scale: [1, 1.05, 1],
      transition: { duration: 0.4, ease: 'easeInOut' },
    },
  },
} as const;
