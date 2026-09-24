import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Database } from "lucide-react";
import { auth } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DatabaseList, type DatabaseRow } from "@/components/settings/database-list";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";

interface DatabasesPageProps {
  params: Promise<{ lang: string }>;
}

export default async function DatabasesPage({ params }: DatabasesPageProps) {
  const { lang } = await params;
  const dict = await getDictionary(lang as Locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const projects = await prisma.project.findMany({
    where: { userId: session.user.id },
    select: { id: true, name: true, database: true },
  });

  const rows: DatabaseRow[] = [];
  for (const project of projects) {
    const db = project.database as Record<string, unknown> | null;
    if (!db || typeof db.service !== "string") continue;
    rows.push({
      projectId: project.id,
      projectName: project.name,
      service: db.service,
      hostPort: Number(db.hostPort ?? 0),
      status: String(db.status ?? "ready"),
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <Link
        href={`/${lang}/settings`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {dict.databases.back}
      </Link>

      <div className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Database className="size-6 text-primary" /> {dict.databases.title}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">{dict.databases.subtitle}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{dict.databases.provisioned}</CardTitle>
        </CardHeader>
        <CardContent>
          <DatabaseList
            rows={rows}
            labels={{
              empty: dict.databases.empty,
              delete: dict.databases.delete,
              failed: dict.databases.deleteFailed,
              networkError: dict.studio.networkError,
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
