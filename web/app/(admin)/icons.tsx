const PATHS = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="1.8" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.8" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="1.8" />
    </>
  ),
  alumnos: (
    <>
      <path d="M2.5 9.5 12 5l9.5 4.5L12 14 2.5 9.5Z" />
      <path d="M6.5 11.8V16c0 1.4 2.5 2.8 5.5 2.8s5.5-1.4 5.5-2.8v-4.2" />
      <path d="M21.5 9.5V14" />
    </>
  ),
  apoderados: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <circle cx="17" cy="9" r="2.4" />
      <path d="M17.5 14c2.4.2 4 1.9 4 4.5" />
    </>
  ),
  qr: (
    <>
      <rect x="3.5" y="3.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="14" y="3.5" width="6.5" height="6.5" rx="1.4" />
      <rect x="3.5" y="14" width="6.5" height="6.5" rx="1.4" />
      <path d="M14 14h2.5M20.5 14v2.5M14 17.5v3M17.5 17.5h3v3" />
    </>
  ),
  auditoria: (
    <>
      <rect x="5" y="4.5" width="14" height="16" rx="2.4" />
      <path d="M9.5 4.5V4a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v.5" />
      <path d="M8.5 10.5h7M8.5 14h7M8.5 17.5h4" />
    </>
  ),
  out: (
    <>
      <path d="M10 4.5H6.5a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2H10" />
      <path d="M15 8l4 4-4 4M19 12H9.5" />
    </>
  ),
  x: <path d="M6 6l12 12M18 6 6 18" />,
  menu: <path d="M5 9h14M5 15h14" />,
};

export type IconName = keyof typeof PATHS;

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
