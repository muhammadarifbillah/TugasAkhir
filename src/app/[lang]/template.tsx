/**
 * Per-navigation wrapper. Page animation is handled by <PageTransition> inside
 * each page (React view transitions), so this only keeps the remount boundary.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
