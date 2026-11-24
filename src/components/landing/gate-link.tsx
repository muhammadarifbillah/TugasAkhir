"use client";

import { createContext, useContext, useState } from "react";

/** Links the §3 temper coupons and the §6 mapping rows: pointing at one highlights the other. */
const GateLinkContext = createContext<{ active: number | null; setActive: (i: number | null) => void }>({
  active: null,
  setActive: () => {},
});

export function GateLinkProvider({ children }: { children: React.ReactNode }) {
  const [active, setActive] = useState<number | null>(null);
  return <GateLinkContext.Provider value={{ active, setActive }}>{children}</GateLinkContext.Provider>;
}

export const useGateLink = () => useContext(GateLinkContext);
