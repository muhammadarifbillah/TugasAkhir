"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, m } from "motion/react";
import { LogOut, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import type { Locale } from "@/lib/i18n";

interface MobileMenuProps {
  lang: Locale;
  labels: {
    dashboard: string;
    settings: string;
    signOut: string;
    signIn: string;
    user: string;
    toggleTheme: string;
    language: string;
    openMenu: string;
    closeMenu: string;
  };
  isLoggedIn: boolean;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  userUsername: string | null;
  logoutAction: () => Promise<void>;
}

/**
 * Responsive navigation for narrow viewports (the hamburger). Everything it
 * needs is passed as flat, already-resolved label strings, so it can never be
 * handed a partial dictionary object.
 */
export function MobileMenu({
  lang,
  labels,
  isLoggedIn,
  userName,
  userEmail,
  userImage,
  userUsername,
  logoutAction,
}: MobileMenuProps) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on Escape and lock background scroll while the panel is open.
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        className="size-11"
        onClick={() => setOpen(!open)}
        aria-label={open ? labels.closeMenu : labels.openMenu}
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
      >
        {open ? <X className="size-5" /> : <Menu className="size-5" />}
      </Button>

      <AnimatePresence>
        {open && (
          <m.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
        )}
        {open && (
          <m.div
            key="panel"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            style={{ transformOrigin: "top right" }}
            id="mobile-nav-panel"
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label={labels.openMenu}
            className="fixed end-0 top-14 z-50 w-64 border-b bg-background p-4 shadow-lg focus:outline-none"
          >
            <nav className="flex flex-col gap-1">
              {isLoggedIn && (
                <>
                  <Link
                    href={`/${lang}/dashboard`}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-accent"
                    onClick={() => setOpen(false)}
                  >
                    {labels.dashboard}
                  </Link>
                  <Link
                    href={`/${lang}/settings`}
                    className="flex min-h-11 items-center rounded-md px-3 text-sm hover:bg-accent"
                    onClick={() => setOpen(false)}
                  >
                    {labels.settings}
                  </Link>
                </>
              )}

              <div className="my-2 border-t" />

              <div className="flex items-center justify-between gap-2 px-3 py-1">
                <span className="text-xs text-muted-foreground">{labels.language}</span>
                <LocaleSwitcher currentLocale={lang} label={labels.language} />
              </div>

              <div className="flex items-center justify-between px-3 py-1">
                <span className="text-xs text-muted-foreground">{labels.toggleTheme}</span>
                <ThemeToggle label={labels.toggleTheme} />
              </div>

              <div className="my-2 border-t" />

              {isLoggedIn ? (
                <>
                  <div className="flex items-center gap-2 px-3 py-1">
                    {userImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={userImage}
                        alt={userName ?? labels.user}
                        className="size-6 rounded-full bg-muted"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">
                        {(userName ?? userEmail ?? "U").slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="truncate text-xs">{userUsername ?? userName}</span>
                  </div>
                  <form
                    action={async () => {
                      await logoutAction();
                    }}
                  >
                    <Button
                      type="submit"
                      variant="ghost"
                      className="w-full justify-start gap-2 px-3 text-sm"
                      onClick={() => setOpen(false)}
                    >
                      <LogOut className="size-4" />
                      {labels.signOut}
                    </Button>
                  </form>
                </>
              ) : (
                <Button asChild size="sm" className="mx-3">
                  <Link href={`/${lang}/login`} onClick={() => setOpen(false)}>
                    {labels.signIn}
                  </Link>
                </Button>
              )}
            </nav>
          </m.div>
        )}
      </AnimatePresence>
    </div>
  );
}
