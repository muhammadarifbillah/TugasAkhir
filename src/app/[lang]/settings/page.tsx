import Link from "next/link";
import { redirect } from "next/navigation";
import { Database, History, ShieldCheck } from "lucide-react";
import { auth, githubConfigured } from "@/auth";
import { ByokManager } from "@/components/settings/byok-manager";
import { GithubActions } from "@/components/settings/github-actions";
import { UsageCard } from "@/components/settings/usage-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GithubIcon } from "@/components/ui/github-icon";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";

interface SettingsProps {
  params: Promise<{ lang: string }>;
}

export default async function SettingsPage({ params }: SettingsProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const [providers, apiKeys, models, user] = await Promise.all([
    prisma.modelProvider.findMany({ orderBy: { code: "asc" } }),
    prisma.userApiKey.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        providerCode: true,
        keyMasked: true,
        label: true,
        isActive: true,
        createdAt: true,
      },
    }),
    prisma.userModel.findMany({
      where: { userId: session.user.id },
      include: { provider: true, apiKey: { select: { keyMasked: true, providerCode: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { githubUsername: true, githubAvatarUrl: true },
    }),
  ]);

  // Token usage is aggregated in SQL — never load every message into memory.
  // Chat usage lives in Message.promptMeta; Design Studio and stack picks live
  // in AiUsage, so both sources are folded into one daily series.
  const usageRows = await prisma.$queryRaw<
    { day: Date; prompt: number | null; completion: number | null }[]
  >`
    SELECT day,
           SUM(prompt)::int AS prompt,
           SUM(completion)::int AS completion
    FROM (
      SELECT date_trunc('day', m."createdAt")::date AS day,
             COALESCE(SUM((m."promptMeta"->'usage'->>'prompt')::int), 0) AS prompt,
             COALESCE(SUM((m."promptMeta"->'usage'->>'completion')::int), 0) AS completion
      FROM messages m
      JOIN chats c ON c.id = m."chatId"
      WHERE c."userId" = ${session.user.id} AND m.role = 'assistant'
      GROUP BY date_trunc('day', m."createdAt")::date
      UNION ALL
      SELECT date_trunc('day', u."createdAt")::date AS day,
             u."promptTokens" AS prompt,
             u."completionTokens" AS completion
      FROM ai_usage u
      WHERE u."userId" = ${session.user.id}
    ) merged
    GROUP BY day
    ORDER BY day ASC
  `;

  const usageSeries = usageRows.map((row) => ({
    day: new Date(row.day).toISOString().slice(0, 10),
    prompt: Number(row.prompt ?? 0),
    completion: Number(row.completion ?? 0),
  }));

  const plan = (p: (typeof providers)[number]) => ({
    code: p.code,
    name: p.name,
    requiresKey: p.requiresKey,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{dict.settings.title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.settings.aiModelsSubtitle}</p>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <Link
            href={`/${lang}/settings/audit`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <ShieldCheck className="size-4" /> {dict.audit.title}
          </Link>
          <Link
            href={`/${lang}/settings/databases`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <Database className="size-4" /> {dict.databases.title}
          </Link>
          <Link
            href={`/${lang}/settings/history`}
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
          >
            <History className="size-4" /> {dict.history.title}
          </Link>
        </div>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GithubIcon className="size-4" /> {dict.settings.githubTitle}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            {user?.githubUsername ? (
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="success">{dict.settings.githubConnected}</Badge>
                  <span className="font-mono text-xs">@{user.githubUsername}</span>
                </div>
                <GithubActions
                  dict={dict}
                  lang={lang}
                  connected
                  oauthAvailable={githubConfigured}
                />
              </div>
            ) : (
              <GithubActions
                dict={dict}
                lang={lang}
                connected={false}
                oauthAvailable={githubConfigured}
              />
            )}
          </CardContent>
        </Card>

        <UsageCard
          series={usageSeries}
          labels={{
            title: dict.settings.tokenUsage,
            daily: dict.settings.usageDaily,
            monthly: dict.settings.usageMonthly,
            yearly: dict.settings.usageYearly,
            prompt: dict.settings.promptTokens,
            completion: dict.settings.completionTokens,
            total: dict.settings.usageTotal,
            period: dict.settings.usagePeriod,
            empty: dict.settings.usageEmpty,
            note: dict.settings.usageNote,
          }}
        />
      </div>

      <ByokManager
        providers={providers.map(plan)}
        apiKeys={apiKeys.map((k) => ({
          id: k.id,
          providerCode: k.providerCode,
          keyMasked: k.keyMasked,
          label: k.label,
          isActive: k.isActive,
        }))}
        models={models.map((m) => ({
          id: m.id,
          providerCode: m.providerCode,
          modelName: m.modelName,
          temperature: m.temperature,
          maxTokens: m.maxTokens,
          isDefault: m.isDefault,
          apiKeyMasked: m.apiKey?.keyMasked ?? null,
        }))}
        dict={dict}
      />
    </div>
  );
}