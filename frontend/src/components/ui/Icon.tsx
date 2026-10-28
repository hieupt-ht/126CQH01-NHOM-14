const paths = {
  home: ['m3 10 9-7 9 7', 'M5 9v12h5v-7h4v7h5V9'],
  sparkles: ['m12 3-2 6-6 2 6 2 2 6 2-6 6-2-6-2-2-6Z', 'm20 2 .6 2.4L23 5l-2.4.6L20 8l-.6-2.4L17 5l2.4-.6L20 2Z'],
  image: ['M4 3h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z', 'm3 17 6-6 4 4 3-3 5 5', 'M7 7h.01'],
  history: ['M3 11a9 9 0 1 1 2.7 7', 'M3 4v7h7', 'M12 7v5l3 2'],
  heart: ['M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z'],
  settings: ['M9 3h6l1 3 3 1 2 5-2 3-1 4-4 2-3-2-4-1-2-4 2-3 1-4 1-4Z', 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6Z'],
  search: ['M10.5 3a7.5 7.5 0 1 0 0 15 7.5 7.5 0 0 0 0-15Z', 'm16 16 5 5'],
  arrow: ['M4 12h16', 'm14 6 6 6-6 6'],
  chevron: ['m7 10 5 5 5-5'],
  close: ['m6 6 12 12', 'M6 18 18 6'],
  menu: ['M4 6h16', 'M4 12h16', 'M4 18h16'],
  shield: ['m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z', 'm8 12 3 3 5-6'],
  bolt: ['m13 2-9 12h7l-1 8 10-13h-7l1-7Z'],
  grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M3 14h7v7H3z', 'M14 14h7v7h-7z'],
  info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18Z', 'M12 11v5', 'M12 7h.01'],
  check: ['m5 12 4 4L19 6'],
  copy: ['M9 8h11v13H9z', 'M15 8V3H4v13h5'],
  wand: ['m3 20 14-14 3 3L6 23', 'm14 9 3 3', 'M5 3v4', 'M3 5h4', 'M19 2v4', 'M17 4h4'],
  book: ['M3 4h7l2 2 2-2h7v15h-7l-2 2-2-2H3z', 'M12 6v15'],
} as const;

export type IconName = keyof typeof paths;
export default function Icon({ name, size = 20, filled = false }: { name: IconName; size?: number; filled?: boolean }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths[name].map((path, i) => <path key={i} d={path} />)}
  </svg>;
}
