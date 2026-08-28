/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Colors - Charts (ordered strictly as specified)
export const CHART_COLORS = [
  '#2563EB', // Royal blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#6366F1', // Indigo
  '#EF4444', // Red
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#A855F7', // Purple
];

// Motion Animation Presets (stagger, duration, easing)
export const ANIMATION_PRESETS = {
  page: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
  card: (index = 0) => ({
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, delay: index * 0.05, ease: 'easeOut' as const },
  }),
  cardHover: {
    whileHover: { y: -2, boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    transition: { duration: 0.2 },
  },
  buttonClick: {
    whileTap: { scale: 0.97 },
    transition: { duration: 0.1 },
  },
  sidebar: {
    transition: { type: 'spring' as const, stiffness: 260, damping: 26 },
  },
  modal: {
    backdrop: {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
    },
    content: {
      initial: { opacity: 0, scale: 0.95 },
      animate: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0.95 },
      transition: { duration: 0.2 },
    },
  },
  dropdown: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: 0.15 },
  },
};
