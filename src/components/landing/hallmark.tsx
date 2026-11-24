import { cn } from "@/lib/utils";

/**
 * Gate hallmarks: one outline shape per gate so a stage is never identified by
 * colour alone (◇ ○ △ □ ⬡). Decorative; always rendered next to a text label.
 */
const SHAPES: Record<1 | 2 | 3 | 4 | 5, React.ReactNode> = {
  1: <polygon points="12,3 21,12 12,21 3,12" />,
  2: <circle cx="12" cy="12" r="8.5" />,
  3: <polygon points="12,3.5 21,19.5 3,19.5" />,
  4: <rect x="4.5" y="4.5" width="15" height="15" />,
  5: <polygon points="12,3 19.8,7.5 19.8,16.5 12,21 4.2,16.5 4.2,7.5" />,
};

export function Hallmark({ stage, className }: { stage: 1 | 2 | 3 | 4 | 5; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("size-5 shrink-0", className)}
      style={{ color: `var(--stage-${stage})` }}
    >
      {SHAPES[stage]}
    </svg>
  );
}
