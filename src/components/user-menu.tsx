"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LayoutDashboard, LogOut, Settings } from "lucide-react";
import type { Locale } from "@/lib/i18n";

interface UserMenuProps {
  lang: Locale;
  labels: { dashboard: string; settings: string; signOut: string; user: string };
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  logoutAction: () => Promise<void>;
}

/** Desktop account dropdown (profile, dashboard, settings, sign out). */
export function UserMenu({
  lang,
  labels,
  name,
  email,
  image,
  username,
  logoutAction,
}: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const display = username ?? name ?? email ?? labels.user;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full border py-1 ps-1 pe-2 text-xs transition-colors hover:bg-accent"
      >
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={image}
            alt={display}
            className="size-6 rounded-full bg-muted"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
            {display.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="max-w-28 truncate">{display}</span>
        <ChevronDown className={`size-3 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="menu"
          className="card-elevated absolute end-0 top-[calc(100%+6px)] z-50 w-56 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground"
        >
          <div className="px-3 py-2">
            <p className="truncate text-xs font-medium">{display}</p>
            {email && <p className="truncate text-[11px] text-muted-foreground">{email}</p>}
          </div>
          <div className="my-1 border-t" />
          <Link
            role="menuitem"
            href={`/${lang}/dashboard`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            <LayoutDashboard className="size-4" /> {labels.dashboard}
          </Link>
          <Link
            role="menuitem"
            href={`/${lang}/settings`}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent"
          >
            <Settings className="size-4" /> {labels.settings}
          </Link>
          <div className="my-1 border-t" />
          <form
            action={async () => {
              await logoutAction();
            }}
          >
            <button
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10"
            >
              <LogOut className="size-4" /> {labels.signOut}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
