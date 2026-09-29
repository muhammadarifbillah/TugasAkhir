import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { backfillProjectRequirements } from "../src/lib/requirements";

/**
 * One-off backfill: create SecurityRequirement rows for projects whose Analysis
 * stage ran before the traceability feature existed. Usage:
 *   npx tsx scripts/backfill-requirements.ts [projectId]
 * With no argument it processes every project.
 */
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const argId = process.argv[2];
  const projects = await prisma.project.findMany({
    where: argId ? { id: argId } : undefined,
    select: { id: true, name: true },
  });

  let totalCreated = 0;
  for (const project of projects) {
    const created = await backfillProjectRequirements(project.id);
    if (created > 0) {
      console.log(`[backfill] ${project.name} (${project.id}): +${created} requirement(s)`);
    }
    totalCreated += created;
  }
  console.log(`Done. Created ${totalCreated} requirement row(s) across ${projects.length} project(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
