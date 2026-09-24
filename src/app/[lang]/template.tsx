/**
 * Per-navigation wrapper. Remounts on route change, giving each page a subtle
 * fade-in. The animation is disabled under `prefers-reduced-motion` (globals.css).
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
