import type { Metadata } from "next";
import { getDictionary } from "@/lib/i18n";
import { SITE_CATEGORIES } from "@/lib/site-categories";
import { SITE_TEMPLATES } from "@/lib/site-templates";

interface CreditsPageProps {
  params: Promise<{ lang: string }>;
}

export async function generateMetadata({ params }: CreditsPageProps): Promise<Metadata> {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  return { title: `${dict.credits.title} · ${dict.app.name}` };
}

/** The 24 example templates of the gallery, all made by FUSE in Indonesian, grouped per category. */
export default async function CreditsPage({ params }: CreditsPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const descs = dict.templates as Record<string, { desc: string }>;

  return (
    <div className="mx-auto w-full max-w-6xl bg-background px-4 py-12 text-foreground">
      <h1 className="text-3xl font-semibold">{dict.credits.title}</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">{dict.credits.intro}</p>
      <div className="mt-10 grid gap-8 md:grid-cols-2">
        {SITE_CATEGORIES.map((cat) => (
          <section key={cat.id} data-credit-group={cat.id} className="border-t border-border pt-4">
            <h2 className="text-lg font-semibold">{dict.categories.items[cat.id].name}</h2>
            <ul className="mt-3 space-y-3">
              {SITE_TEMPLATES[cat.id].map((t) => (
                <li key={t.slug} data-credit-item={t.slug}>
                  <p className="font-medium">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{descs[t.slug]?.desc}</p>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
