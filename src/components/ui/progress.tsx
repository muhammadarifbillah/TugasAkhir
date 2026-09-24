import * as ProgressPrimitive from "@radix-ui/react-progress";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

function Progress({
  className,
  value,
  indicatorClassName,
  ...props
}: ComponentProps<typeof ProgressPrimitive.Root> & { indicatorClassName?: string }) {
  // Radix renders role="progressbar"; without a name screen readers announce it
  // generically. Callers can override with their own aria-label/labelledby.
  const hasName = Boolean(props["aria-label"] || props["aria-labelledby"]);

  return (
    <ProgressPrimitive.Root
      // `value` must reach Radix or it never emits aria-valuenow and assistive
      // technology announces every progress bar as indeterminate.
      value={value}
      className={cn("relative h-2 w-full overflow-hidden rounded-full bg-secondary", className)}
      {...props}
      {...(hasName ? {} : { "aria-label": "Progress" })}
    >
      <ProgressPrimitive.Indicator
        className={cn("h-full w-full flex-1 bg-primary transition-all", indicatorClassName)}
        style={{ transform: `translateX(-${100 - (value ?? 0)}%)` }}
      />
    </ProgressPrimitive.Root>
  );
}

export { Progress };