/**
 * Centralized Project Theme System
 * Maps project color hex values to reusable Tailwind token sets.
 * Each theme defines primary, background, border, badge, and hover tokens.
 */

const themes = {
  '#3b82f6': {
    name: 'Blue',
    primary:      'text-blue-600 dark:text-blue-400',
    primaryBg:    'bg-blue-600 dark:bg-blue-500',
    softBg:       'bg-blue-50/60 dark:bg-blue-950/25',
    tintBg:       'bg-blue-50 dark:bg-blue-950/30',
    border:       'border-blue-200 dark:border-blue-800',
    softBorder:   'border-blue-100 dark:border-blue-900/40',
    badge:        'bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/40',
    hoverBorder:  'hover:border-blue-200 dark:hover:border-blue-800',
    hoverBg:      'hover:bg-blue-50/40 dark:hover:bg-blue-950/20',
    ring:         'ring-blue-200/60 dark:ring-blue-900/40',
    dot:          'bg-blue-500',
    btnBg:        'bg-blue-600 hover:bg-blue-700',
    accentText:   'group-hover:text-blue-600 dark:group-hover:text-blue-400',
  },
  '#8b5cf6': {
    name: 'Purple',
    primary:      'text-violet-600 dark:text-violet-400',
    primaryBg:    'bg-violet-600 dark:bg-violet-500',
    softBg:       'bg-violet-50/60 dark:bg-violet-950/25',
    tintBg:       'bg-violet-50 dark:bg-violet-950/30',
    border:       'border-violet-200 dark:border-violet-800',
    softBorder:   'border-violet-100 dark:border-violet-900/40',
    badge:        'bg-violet-50 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 border-violet-100 dark:border-violet-900/40',
    hoverBorder:  'hover:border-violet-200 dark:hover:border-violet-800',
    hoverBg:      'hover:bg-violet-50/40 dark:hover:bg-violet-950/20',
    ring:         'ring-violet-200/60 dark:ring-violet-900/40',
    dot:          'bg-violet-500',
    btnBg:        'bg-violet-600 hover:bg-violet-700',
    accentText:   'group-hover:text-violet-600 dark:group-hover:text-violet-400',
  },
  '#10b981': {
    name: 'Emerald',
    primary:      'text-emerald-600 dark:text-emerald-400',
    primaryBg:    'bg-emerald-600 dark:bg-emerald-500',
    softBg:       'bg-emerald-50/60 dark:bg-emerald-950/25',
    tintBg:       'bg-emerald-50 dark:bg-emerald-950/30',
    border:       'border-emerald-200 dark:border-emerald-800',
    softBorder:   'border-emerald-100 dark:border-emerald-900/40',
    badge:        'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/40',
    hoverBorder:  'hover:border-emerald-200 dark:hover:border-emerald-800',
    hoverBg:      'hover:bg-emerald-50/40 dark:hover:bg-emerald-950/20',
    ring:         'ring-emerald-200/60 dark:ring-emerald-900/40',
    dot:          'bg-emerald-500',
    btnBg:        'bg-emerald-600 hover:bg-emerald-700',
    accentText:   'group-hover:text-emerald-600 dark:group-hover:text-emerald-400',
  },
  '#f59e0b': {
    name: 'Amber',
    primary:      'text-amber-600 dark:text-amber-400',
    primaryBg:    'bg-amber-600 dark:bg-amber-500',
    softBg:       'bg-amber-50/60 dark:bg-amber-950/25',
    tintBg:       'bg-amber-50 dark:bg-amber-950/30',
    border:       'border-amber-200 dark:border-amber-800',
    softBorder:   'border-amber-100 dark:border-amber-900/40',
    badge:        'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/40',
    hoverBorder:  'hover:border-amber-200 dark:hover:border-amber-800',
    hoverBg:      'hover:bg-amber-50/40 dark:hover:bg-amber-950/20',
    ring:         'ring-amber-200/60 dark:ring-amber-900/40',
    dot:          'bg-amber-500',
    btnBg:        'bg-amber-600 hover:bg-amber-700',
    accentText:   'group-hover:text-amber-600 dark:group-hover:text-amber-400',
  },
  '#ef4444': {
    name: 'Rose',
    primary:      'text-rose-600 dark:text-rose-400',
    primaryBg:    'bg-rose-600 dark:bg-rose-500',
    softBg:       'bg-rose-50/60 dark:bg-rose-950/25',
    tintBg:       'bg-rose-50 dark:bg-rose-950/30',
    border:       'border-rose-200 dark:border-rose-800',
    softBorder:   'border-rose-100 dark:border-rose-900/40',
    badge:        'bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-900/40',
    hoverBorder:  'hover:border-rose-200 dark:hover:border-rose-800',
    hoverBg:      'hover:bg-rose-50/40 dark:hover:bg-rose-950/20',
    ring:         'ring-rose-200/60 dark:ring-rose-900/40',
    dot:          'bg-rose-500',
    btnBg:        'bg-rose-600 hover:bg-rose-700',
    accentText:   'group-hover:text-rose-600 dark:group-hover:text-rose-400',
  },
  '#64748b': {
    name: 'Slate',
    primary:      'text-slate-600 dark:text-slate-400',
    primaryBg:    'bg-slate-600 dark:bg-slate-500',
    softBg:       'bg-slate-50/60 dark:bg-slate-800/25',
    tintBg:       'bg-slate-100 dark:bg-slate-800/50',
    border:       'border-slate-300 dark:border-slate-700',
    softBorder:   'border-slate-200 dark:border-slate-700/50',
    badge:        'bg-slate-100 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700/50',
    hoverBorder:  'hover:border-slate-300 dark:hover:border-slate-700',
    hoverBg:      'hover:bg-slate-50/40 dark:hover:bg-slate-800/20',
    ring:         'ring-slate-200/60 dark:ring-slate-700/40',
    dot:          'bg-slate-500',
    btnBg:        'bg-slate-600 hover:bg-slate-700',
    accentText:   'group-hover:text-slate-700 dark:group-hover:text-slate-300',
  },
  '#ec4899': {
    name: 'Pink',
    primary:      'text-pink-600 dark:text-pink-400',
    primaryBg:    'bg-pink-600 dark:bg-pink-500',
    softBg:       'bg-pink-50/60 dark:bg-pink-950/25',
    tintBg:       'bg-pink-50 dark:bg-pink-950/30',
    border:       'border-pink-200 dark:border-pink-800',
    softBorder:   'border-pink-100 dark:border-pink-900/40',
    badge:        'bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 border-pink-100 dark:border-pink-900/40',
    hoverBorder:  'hover:border-pink-200 dark:hover:border-pink-800',
    hoverBg:      'hover:bg-pink-50/40 dark:hover:bg-pink-950/20',
    ring:         'ring-pink-200/60 dark:ring-pink-900/40',
    dot:          'bg-pink-500',
    btnBg:        'bg-pink-600 hover:bg-pink-700',
    accentText:   'group-hover:text-pink-600 dark:group-hover:text-pink-400',
  },
  '#06b6d4': {
    name: 'Cyan',
    primary:      'text-cyan-600 dark:text-cyan-400',
    primaryBg:    'bg-cyan-600 dark:bg-cyan-500',
    softBg:       'bg-cyan-50/60 dark:bg-cyan-950/25',
    tintBg:       'bg-cyan-50 dark:bg-cyan-950/30',
    border:       'border-cyan-200 dark:border-cyan-800',
    softBorder:   'border-cyan-100 dark:border-cyan-900/40',
    badge:        'bg-cyan-50 dark:bg-cyan-950/30 text-cyan-600 dark:text-cyan-400 border-cyan-100 dark:border-cyan-900/40',
    hoverBorder:  'hover:border-cyan-200 dark:hover:border-cyan-800',
    hoverBg:      'hover:bg-cyan-50/40 dark:hover:bg-cyan-950/20',
    ring:         'ring-cyan-200/60 dark:ring-cyan-900/40',
    dot:          'bg-cyan-500',
    btnBg:        'bg-cyan-600 hover:bg-cyan-700',
    accentText:   'group-hover:text-cyan-600 dark:group-hover:text-cyan-400',
  },
};

// Default fallback theme (blue)
const defaultTheme = themes['#3b82f6'];

/**
 * Get the full theme token set for a given project color hex.
 * Falls back to blue if the color isn't in the predefined map.
 */
export const getProjectTheme = (colorHex) => {
  return themes[colorHex] || defaultTheme;
};

export default themes;
