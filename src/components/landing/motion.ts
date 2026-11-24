/** Shared landing motion vocabulary (see DESIGN-BLUEPRINT §7). */
export const EASE = [0.22, 1, 0.36, 1] as const;

/** Stagger delay for item `i`, capped so long lists never lag. */
export const stagger = (i: number, step = 0.06) => Math.min(i * step, 0.4);

/** Fade + lift once when scrolled into view; reduced motion keeps the fade only. */
export const reveal = (delay = 0) =>
  ({
    initial: { opacity: 0, y: 16 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-80px" },
    transition: { duration: 0.5, ease: EASE, delay },
  }) as const;
