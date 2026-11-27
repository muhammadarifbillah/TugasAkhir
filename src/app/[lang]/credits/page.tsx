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

const LINK = "underline underline-offset-2 break-all hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const CELL = "block px-0 py-1 align-top md:table-cell md:px-3 md:py-3";
// On mobile each row stacks into a card, so each cell carries its own column label.
const LABEL = "mr-1 font-medium text-muted-foreground md:hidden";

/** Credits for the 24 open-source templates whose screenshots the gallery shows (MIT / CC BY attribution). */
export default async function CreditsPage({ params }: CreditsPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang);
  const c = dict.credits;

  return (
    <div className="mx-auto w-full max-w-6xl bg-background px-4 py-12 text-foreground">
      <h1 className="text-3xl font-semibold">{c.title}</h1>
      <p className="mt-4 max-w-prose text-muted-foreground">{c.intro}</p>
      <table className="mt-10 block w-full text-left text-sm md:table">
        <thead className="sr-only md:not-sr-only md:table-header-group">
          <tr className="border-b border-border">
            {(["category", "template", "license", "source", "attribution"] as const).map((k) => (
              <th key={k} scope="col" className="px-3 py-2 font-medium">
                {c.columns[k]}
              </th>
            ))}
          </tr>
        </thead>
        {SITE_CATEGORIES.map((cat) => {
          const category = dict.categories.items[cat.id].name;
          return (
            <tbody key={cat.id} data-credit-group={cat.id} className="block md:table-row-group">
              {SITE_TEMPLATES[cat.id].map((t) => (
                <tr key={t.slug} data-credit-row={t.slug} className="mb-4 block rounded-lg border border-border p-4 md:mb-0 md:table-row md:rounded-none md:border-x-0 md:border-t-0 md:p-0">
                  <td className={CELL}>
                    <span className={LABEL}>{c.columns.category}:</span>
                    {category}
                  </td>
                  <th scope="row" className={`${CELL} font-medium`}>
                    <span className={LABEL}>{c.columns.template}:</span>
                    {t.name}
                  </th>
                  <td className={CELL}>
                    <span className={LABEL}>{c.columns.license}:</span>
                    <a href={t.licenseUrl} target="_blank" rel="noopener noreferrer" className={LINK}>
                      {t.license}
                    </a>
                  </td>
                  <td className={CELL}>
                    <span className={LABEL}>{c.columns.source}:</span>
                    <a href={t.source} target="_blank" rel="noopener noreferrer" className={LINK}>
                      {t.source.replace(/^https?:\/\//, "")}
                    </a>
                  </td>
                  <td className={CELL}>
                    <span className={LABEL}>{c.columns.attribution}:</span>
                    {/* The data's note after " — " is an internal reminder in Indonesian; only the credit line is shown. */}
                    {t.attribution ? t.attribution.split(" — ")[0] : c.noAttribution}
                  </td>
                </tr>
              ))}
            </tbody>
          );
        })}
      </table>
    </div>
  );
}
