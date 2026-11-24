"use client";

import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "motion/react";

const MAX_DEG = 4;

/** Tilts its child up to ±4° towards a mouse pointer. Off for touch and reduced motion. */
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  const px = useMotionValue(0);
  const py = useMotionValue(0);
  const sx = useSpring(px, { stiffness: 150, damping: 20 });
  const sy = useSpring(py, { stiffness: 150, damping: 20 });
  const rotateY = useTransform(sx, (v) => v * MAX_DEG);
  const rotateX = useTransform(sy, (v) => -v * MAX_DEG);

  return (
    <m.div
      className={className}
      // Same style on server and client (no hydration mismatch); reduced motion just never moves it.
      style={{ rotateX, rotateY, transformPerspective: 900 }}
      onPointerMove={(e) => {
        if (reduce || e.pointerType !== "mouse") return;
        const r = e.currentTarget.getBoundingClientRect();
        px.set(((e.clientX - r.left) / r.width) * 2 - 1);
        py.set(((e.clientY - r.top) / r.height) * 2 - 1);
      }}
      onPointerLeave={() => {
        px.set(0);
        py.set(0);
      }}
    >
      {children}
    </m.div>
  );
}
