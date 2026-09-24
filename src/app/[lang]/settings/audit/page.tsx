import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { auth } from "@/auth";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";

interface AuditPageProps {
  params: Promise<{ lang: string }>;
}

export default async function AuditPage({ params }: AuditPageProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const logs = await prisma.auditLog.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/${lang}/settings`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {dict.audit.back}
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <ShieldCheck className="size-6 text-primary" /> {dict.audit.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.audit.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.audit.recent}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <EmptyState icon={ShieldCheck} description={dict.audit.empty} className="border-0 py-8" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2 pr-3 font-medium">{dict.audit.action}</th>
                    <th className="py-2 pr-3 font-medium">{dict.audit.details}</th>
                    <th className="py-2 pr-3 font-medium">{dict.audit.ip}</th>
                    <th className="py-2 font-medium">{dict.audit.time}</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b last:border-0 odd:bg-muted/20">
                      <td className="py-2 pr-3">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="max-w-[280px] py-2 pr-3">
                        <span className="line-clamp-1 font-mono text-[10px] text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : "—"}
                        </span>
                      </td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-muted-foreground">
                        {log.ipAddress ?? "—"}
                      </td>
                      <td className="whitespace-nowrap py-2 text-muted-foreground">
                        {log.createdAt.toISOString().replace("T", " ").slice(0, 19)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
