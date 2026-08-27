const COLOR_MAP: Record<string, string> = {
  blanc: '#f1f5f9',
  white: '#f1f5f9',
  noir: '#1e293b',
  black: '#1e293b',
  gris: '#94a3b8',
  gray: '#94a3b8',
  grey: '#94a3b8',
  'gris clair': '#cbd5e1',
  'gris fonce': '#475569',
  anthracite: '#334155',
  argent: '#c0c5ce',
  silver: '#c0c5ce',
  rouge: '#ef4444',
  red: '#ef4444',
  bordeaux: '#9f1239',
  bleu: '#3b82f6',
  blue: '#3b82f6',
  'bleu fonce': '#1d4ed8',
  'bleu ciel': '#7dd3fc',
  vert: '#22c55e',
  green: '#22c55e',
  jaune: '#eab308',
  yellow: '#eab308',
  orange: '#f97316',
  marron: '#92400e',
  brown: '#92400e',
  beige: '#e7d8b1',
  cream: '#fdf6e3',
  or: '#f59e0b',
  gold: '#f59e0b',
  violet: '#8b5cf6',
  purple: '#8b5cf6',
  rose: '#ec4899',
  pink: '#ec4899',
  turquoise: '#06b6d4',
};

export function resolveCarColor(value?: string | null): string | null {
  const s = String(value || '')
    .trim()
    .toLowerCase();
  if (!s) return null;
  if (/^#?[0-9a-f]{6}$/.test(s)) {
    return s.startsWith('#') ? s : `#${s}`;
  }
  if (/^#?[0-9a-f]{3}$/.test(s)) {
    const h = s.replace('#', '');
    return `#${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }
  if (COLOR_MAP[s]) return COLOR_MAP[s];
  for (const [key, hex] of Object.entries(COLOR_MAP)) {
    if (s.includes(key)) return hex;
  }
  return null;
}
