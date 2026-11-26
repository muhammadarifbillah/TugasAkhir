"use client";

import { useSyncExternalStore } from "react";
import { LANDING_MOTION_QUERY } from "./motion";

const subscribe = (cb: () => void) => {
  const mq = window.matchMedia(LANDING_MOTION_QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
};

/** True only where ambient landing motion is allowed (desktop, fine pointer, no reduced motion). Server: false. */
export function useAmbientMotion(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(LANDING_MOTION_QUERY).matches,
    () => false,
  );
}
