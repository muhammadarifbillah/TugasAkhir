import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { auth, githubConfigured } from "@/auth";
import { ByokManager } from "@/components/settings/byok-manager";
import { GithubActions } from "@/components/settings/github-actions";
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
  const usageRows = await prisma.$queryRaw<
    { day: Date; prompt: number | null; completion: number | null }[]
  >`
    SELECT date_trunc('day', m."createdAt")::date AS day,
           COALESCE(SUM((m."promptMeta"->'usage'->>'prompt')::int), 0) AS prompt,
           COALESCE(SUM((m."promptMeta"->'usage'->>'completion')::int), 0) AS completion
    FROM messages m
    JOIN chats c ON c.id = m."chatId"
    WHERE c."userId" = ${session.user.id} AND m.role = 'assistant'
    GROUP BY date_trunc('day', m."createdAt")::date
    ORDER BY day ASC
  `;

  let promptTokens = 0;
  let completionTokens = 0;
  const byDay = new Map<string, { prompt: number; completion: number }>();
  for (const row of usageRows) {
    const prompt = Number(row.prompt ?? 0);
    const completion = Number(row.completion ?? 0);
    promptTokens += prompt;
    completionTokens += completion;
    const day = new Date(row.day).toISOString().slice(0, 10);
    const slot = byDay.get(day) ?? { prompt: 0, completion: 0 };
    slot.prompt += prompt;
    slot.completion += completion;
    byDay.set(day, slot);
  }
  const usageSeries = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, v]) => ({ day, ...v }));
  const maxDayTokens = Math.max(1, ...usageSeries.map((d) => d.prompt + d.completion));

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

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-primary" /> {dict.settings.tokenUsage}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{dict.settings.promptTokens}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{promptTokens.toLocaleString()}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-muted-foreground">{dict.settings.completionTokens}</p>
              <p className="mt-1 text-lg font-semibold tabular-nums">{completionTokens.toLocaleString()}</p>
            </div>
          </CardContent>
          {usageSeries.length > 0 && (
            <CardContent className="border-t pt-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">{dict.settings.usageByDay}</p>
              <div className="flex h-24 items-end gap-1">
                {usageSeries.map((d) => {
                  const total = d.prompt + d.completion;
                  const height = Math.max(4, Math.round((total / maxDayTokens) * 100));
                  const label = d.day.slice(5);
                  return (
                    <div key={d.day} className="group relative flex flex-1 flex-col items-center" title={`${d.day} — ${total.toLocaleString()} tokens`}>
                      <div className="flex w-full flex-1 items-end">
                        <div
                          className="w-full rounded-t bg-primary/80 transition-colors group-hover:bg-primary"
                          style={{ height: `${height}%` }}
                        />
                      </div>
                      <span className="mt-1 text-[9px] text-muted-foreground">{label}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
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