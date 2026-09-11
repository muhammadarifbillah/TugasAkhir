import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { NewProjectDialog } from "@/components/new-project-dialog";
import { prisma } from "@/lib/prisma";
import { getDictionary, type Locale } from "@/lib/i18n";

interface NewProjectProps {
  params: Promise<{ lang: string }>;
}

export default async function NewProjectPage({ params }: NewProjectProps) {
  const { lang } = await params;
  const locale = lang as Locale;
  const dict = await getDictionary(locale);
  const session = await auth();
  if (!session?.user?.id) redirect(`/${lang}/login`);

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { preferredLanguage: true },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-10">
      <NewProjectDialog dict={dict} lang={lang} preferredLanguage={user?.preferredLanguage ?? "en"} />
    </div>
  );
}