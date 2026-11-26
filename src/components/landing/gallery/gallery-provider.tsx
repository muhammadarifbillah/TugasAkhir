"use client";

import { createContext, useContext, useReducer, useRef } from "react";
import { MotionConfig } from "motion/react";
import type { Dictionary } from "@/lib/i18n";
import type { CategoryId } from "@/lib/site-categories";
import { CategoryViewer } from "./category-viewer";
import { VIEWER_INITIAL, viewerReducer } from "./gallery-logic";

interface GalleryValue {
  open: (id: CategoryId, trigger: HTMLElement | null) => void;
  lang: string;
  appName: string;
  labels: Dictionary["categories"];
  copy: Dictionary["landing"]["gallery"];
}

const GalleryContext = createContext<GalleryValue | null>(null);

/** One shared category viewer for the hero wall and the template shelf. */
export function GalleryProvider({
  lang,
  appName,
  labels,
  copy,
  children,
}: {
  lang: string;
  appName: string;
  labels: Dictionary["categories"];
  copy: Dictionary["landing"]["gallery"];
  children: React.ReactNode;
}) {
  const [state, dispatch] = useReducer(viewerReducer, VIEWER_INITIAL);
  const triggerRef = useRef<HTMLElement | null>(null);
  const open = (id: CategoryId, trigger: HTMLElement | null) => {
    triggerRef.current = trigger;
    dispatch({ type: "open", id });
  };

  // LandingMotion skips animations below 1024px; gallery interactions run at every width (reducedMotion is inherited).
  return (
    <MotionConfig skipAnimations={false}>
      <GalleryContext.Provider value={{ open, lang, appName, labels, copy }}>
        {children}
        <CategoryViewer
          state={state}
          dispatch={dispatch}
          lang={lang}
          appName={appName}
          labels={labels}
          copy={copy}
          onClosed={() => triggerRef.current?.focus()}
        />
      </GalleryContext.Provider>
    </MotionConfig>
  );
}

export function useGallery(): GalleryValue {
  const value = useContext(GalleryContext);
  if (!value) throw new Error("useGallery must be used inside GalleryProvider");
  return value;
}
