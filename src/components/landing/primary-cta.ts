// PRD chapter 7: the guest primary CTA goes to register, members go to the dashboard.
export function primaryCta(lang: string, signedIn: boolean): { href: string; label: "ctaPrimary" | "ctaDashboard" } {
  return signedIn ? { href: `/${lang}/dashboard`, label: "ctaDashboard" } : { href: `/${lang}/register`, label: "ctaPrimary" };
}
