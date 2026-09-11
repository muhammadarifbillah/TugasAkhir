import Link from "next/link";
import { LogOut, ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "@/components/mobile-menu";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n";

export async function Header({ lang }: { lang: Locale }) {
  const session = await auth();
  const dict = await getDictionary(lang);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-2 px-4 sm:gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href={`/${lang}`} className="flex items-center gap-2 font-semibold">
            <span className="flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="size-4" />
            </span>
            <span className="text-sm">{dict.app.name}</span>
          </Link>

          <nav className="hidden items-center gap-1 text-sm md:flex">
            {session?.user && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/${lang}/dashboard`}>{dict.nav.dashboard}</Link>
              </Button>
            )}
            {session?.user && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/${lang}/settings`}>{dict.nav.settings}</Link>
              </Button>
            )}
          </nav>
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-2 md:flex">
          <LocaleSwitcher currentLocale={lang} label={dict.settings.language} />
          <ThemeToggle label={dict.settings.toggleTheme} />
          {session?.user ? (
            <div className="flex items-center gap-2">
              <Link
                href={`/${lang}/dashboard`}
                className="flex items-center gap-2 rounded-full border py-1 ps-1 pe-3 text-xs transition-colors hover:bg-accent"
              >
                {session.user.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? dict.auth.user}
                    className="size-6 rounded-full bg-muted"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <span className="flex size-6 items-center justify-center rounded-full bg-primary/15 text-[10px] font-bold text-primary">
                    {(session.user.name ?? session.user.email ?? "U").slice(0, 1).toUpperCase()}
                  </span>
                )}
                <span className="max-w-28 truncate">{session.user.githubUsername ?? session.user.name}</span>
              </Link>
              <form
                action={async () => {
                  "use server";
                  if (session?.user?.id) await writeAudit(session.user.id, "LOGOUT", {});
                  await signOut({ redirectTo: `/${lang}/login` });
                }}
              >
                <Button type="submit" variant="ghost" size="icon" title={dict.nav.signOut}>
                  <LogOut className="size-4" />
                </Button>
              </form>
            </div>
          ) : (
            <Button asChild size="sm">
              <Link href={`/${lang}/login`}>{dict.auth.signInWithGithub}</Link>
            </Button>
          )}
        </div>

        {/* Mobile hamburger */}
        <MobileMenu
          lang={lang}
          labels={{
            dashboard: dict.nav.dashboard,
            settings: dict.nav.settings,
            signOut: dict.nav.signOut,
            signIn: dict.auth.signInWithGithub,
            user: dict.auth.user,
            toggleTheme: dict.settings.toggleTheme,
            language: dict.settings.language,
            openMenu: dict.nav.openMenu,
            closeMenu: dict.nav.closeMenu,
          }}
          isLoggedIn={!!session?.user}
          userName={session?.user?.name ?? null}
          userEmail={session?.user?.email ?? null}
          userImage={session?.user?.image ?? null}
          userUsername={session?.user?.githubUsername ?? null}
          logoutAction={async () => {
            "use server";
            const currentSession = await auth();
            if (currentSession?.user?.id) await writeAudit(currentSession.user.id, "LOGOUT", {});
            await signOut({ redirectTo: `/${lang}/login` });
          }}
        />
      </div>
    </header>
  );
}
