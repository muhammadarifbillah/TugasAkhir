"use client";

import { useState, useEffect, useCallback, createContext, useContext } from "react";
import { AnimatePresence, m } from "motion/react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (
    type: ToastType,
    message: string,
    duration?: number,
    action?: { label: string; onClick: () => void },
  ) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({
  children,
  dismissLabel = "Dismiss",
}: {
  children: React.ReactNode;
  dismissLabel?: string;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (
      type: ToastType,
      message: string,
      duration = 5000,
      action?: { label: string; onClick: () => void },
    ) => {
      const id = Math.random().toString(36).slice(2, 9);
      setToasts((prev) => [...prev, { id, type, message, duration, action }]);
    },
    [],
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} dismissLabel={dismissLabel} />
    </ToastContext.Provider>
  );
}

function ToastContainer({
  toasts,
  removeToast,
  dismissLabel,
}: {
  toasts: Toast[];
  removeToast: (id: string) => void;
  dismissLabel: string;
}) {
  return (
    <div
      // Announced by screen readers as toasts appear. `polite` avoids
      // interrupting the user mid-sentence for a non-critical notification.
      role="status"
      aria-live="polite"
      aria-atomic="false"
      className="fixed bottom-4 end-4 z-[9999] flex max-w-sm flex-col gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onClose={() => removeToast(toast.id)}
            dismissLabel={dismissLabel}
          />
        ))}
      </AnimatePresence>
    </div>
  );
}

function ToastItem({ toast, onClose, dismissLabel }: { toast: Toast; onClose: () => void; dismissLabel: string }) {
  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(onClose, toast.duration);
      return () => clearTimeout(timer);
    }
  }, [toast.duration, onClose]);

  const styles: Record<ToastType, { Icon: typeof CheckCircle; accent: string; border: string }> = {
    success: { Icon: CheckCircle, accent: "text-success", border: "border-success/40" },
    error: { Icon: XCircle, accent: "text-danger", border: "border-danger/40" },
    warning: { Icon: AlertTriangle, accent: "text-warning", border: "border-warning/40" },
    info: { Icon: Info, accent: "text-info", border: "border-info/40" },
  };
  const { Icon, accent, border } = styles[toast.type];

  return (
    <m.div
      layout
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24, transition: { duration: 0.15 } }}
      transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
      // Swipe right to dismiss (pointer/touch); the close button stays the keyboard path.
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={{ left: 0, right: 0.6 }}
      onDragEnd={(_, info) => {
        if (info.offset.x > 80) onClose();
      }}
      className={`card-elevated flex touch-pan-y items-start gap-2 rounded-lg border ${border} bg-card px-3 py-2.5 text-foreground`}
    >
      <Icon className={`mt-0.5 size-4 shrink-0 ${accent}`} aria-hidden="true" />
      <p className="flex-1 text-xs leading-relaxed">{toast.message}</p>
      {toast.action && (
        <button
          type="button"
          onClick={() => {
            toast.action?.onClick();
            onClose();
          }}
          className="mt-0.5 shrink-0 rounded-md border px-2 py-0.5 text-[11px] font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {toast.action.label}
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label={dismissLabel}
        className="mt-0.5 shrink-0 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <X className="size-3" aria-hidden="true" />
      </button>
    </m.div>
  );
}
