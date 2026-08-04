export const TRANSITION = {
  fast: { duration: 0.15, ease: 'easeOut' },
  normal: { duration: 0.3, ease: 'easeInOut' },
  slow: { duration: 0.6, ease: 'easeInOut' },
  spring: { type: 'spring' as const, stiffness: 300, damping: 24 },
  slowSpring: { type: 'spring' as const, stiffness: 100, damping: 20 },
};

export const STAGGER = {
  container: { staggerChildren: 0.1 },
  item: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
  },
};

export const FADE_UP = {
  initial: { opacity: 0, y: 40 },
  animate: { opacity: 1, y: 0 },
  transition: TRANSITION.slow,
};

export const FADE_IN = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: TRANSITION.normal,
};

export const SLIDE_LEFT = {
  initial: { opacity: 0, x: -40 },
  animate: { opacity: 1, x: 0 },
  transition: TRANSITION.slow,
};

export const SLIDE_RIGHT = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  transition: TRANSITION.slow,
};

export const SCALE_IN = {
  initial: { opacity: 0, scale: 0.8 },
  animate: { opacity: 1, scale: 1 },
  transition: TRANSITION.spring,
};
