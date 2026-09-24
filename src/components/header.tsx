import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { auth, signOut } from "@/auth";
import { writeAudit } from "@/lib/audit";
import { AccessibilityToggle } from "@/components/accessibility-toggle";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { ThemeToggle } from "@/components/theme-toggle";
import { MobileMenu } from "@/components/mobile-menu";
import { UserMenu } from "@/components/user-menu";
import { Button } from "@/components/ui/button";
import { getDictionary, type Locale } from "@/lib/i18n";

export async function Header({ lang }: { lang: Locale }) {
  const session = await auth();
  const dict = await getDictionary(lang);

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-md">
      <div className="accent-line h-px w-full" aria-hidden="true" />
      <div className="mx-auto flex h-14 max-w-screen-2xl items-center justify-between gap-2 px-4 sm:gap-4">
        <div className="flex items-center gap-4 sm:gap-6">
          <Link href={`/${lang}`} className="flex items-center gap-2 font-semibold">
            <span className="brand-gradient flex size-7 items-center justify-center rounded-md text-primary-foreground shadow-sm">
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
          <AccessibilityToggle
            labels={{
              title: dict.a11y.title,
              fontSize: dict.a11y.fontSize,
              contrast: dict.a11y.contrast,
              contrastHigh: dict.a11y.contrastHigh,
              contrastNormal: dict.a11y.contrastNormal,
            }}
          />
          <ThemeToggle label={dict.settings.toggleTheme} />
          {session?.user ? (
            <UserMenu
              lang={lang}
              labels={{
                dashboard: dict.nav.dashboard,
                settings: dict.nav.settings,
                signOut: dict.nav.signOut,
                user: dict.auth.user,
              }}
              name={session.user.name ?? null}
              email={session.user.email ?? null}
              image={session.user.image ?? null}
              username={session.user.githubUsername ?? null}
              logoutAction={async () => {
                "use server";
                const currentSession = await auth();
                if (currentSession?.user?.id) await writeAudit(currentSession.user.id, "LOGOUT", {});
                await signOut({ redirectTo: `/${lang}/login` });
              }}
            />
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
