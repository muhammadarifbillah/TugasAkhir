"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

interface FullscreenViewerProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export function FullscreenViewer({ title, onClose, children }: FullscreenViewerProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between border-b px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 shrink-0 bg-background">
        <h2 className="text-sm sm:text-base md:text-lg font-semibold truncate pr-4">{title}</h2>
        <button onClick={onClose} className="rounded-md p-1.5 hover:bg-muted shrink-0" aria-label="Close">
          <X className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-auto p-2 sm:p-4 md:p-6">{children}</div>
    </div>
  );
}