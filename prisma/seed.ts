import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PROVIDERS = [
  { code: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", requiresKey: true, defaultModel: "gpt-4o-mini" },
  { code: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", requiresKey: true, defaultModel: "openrouter/auto" },
  { code: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", requiresKey: true, defaultModel: "claude-3-5-sonnet-latest" },
  { code: "ollama", name: "Ollama (local)", baseUrl: "http://localhost:11434/v1", requiresKey: false, defaultModel: "llama3.2" },
  { code: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", requiresKey: true, defaultModel: "gemini-flash-latest" },
] as const;

const STAGES = [
  {
    code: "analysis",
    name: "Analysis & Requirements",
    orderIndex: 0,
    nistGroups: ["PO", "PW"],
    description: "Scope the website, recommend a language/stack, and define security & privacy requirements.",
    systemPromptTemplate: "",
  },
  {
    code: "design",
    name: "Design & Architecture",
    orderIndex: 1,
    nistGroups: ["PW"],
    description: "Threat model, architecture diagram, database schema and auth flow design.",
    systemPromptTemplate: "",
  },
  {
    code: "development",
    name: "Secure Development",
    orderIndex: 2,
    nistGroups: ["PW", "PS"],
    description: "Generate secure source code. NIST PW.5 secure coding enforced.",
    systemPromptTemplate: "",
  },
  {
    code: "testing",
    name: "Security Testing & Audit",
    orderIndex: 3,
    nistGroups: ["PW", "RV"],
    description: "Scan for vulnerabilities, review recommendations and auto-fix issues.",
    systemPromptTemplate: "",
  },
  {
    code: "handover",
    name: "Handover & Deliverables",
    orderIndex: 4,
    nistGroups: ["PW", "PS", "RV"],
    description: "Export source code to ZIP or push to your GitHub repository with docs.",
    systemPromptTemplate: "",
  },
] as const;

// NIST SP 800-218 (SSDF rev 1.1) tasks used by the engine + ISO 27001:2022 Annex A crosswalk
const NIST_CONTROLS = [
  { taskCode: "PO.1.1", groupCode: "PO", title: "Gather information from work producers", description: "Collect and store info needed to implement the SDLCA, including the software development workflow and security requirements.", iso: ["A.5.1", "A.5.8"] },
  { taskCode: "PO.3.1", groupCode: "PO", title: "Risk management plan", description: "Implement and document a software development risk management plan that includes security and privacy risks.", iso: ["A.5.1", "A.5.8", "A.5.24"] },
  { taskCode: "PO.4.1", groupCode: "PO", title: "Security training", description: "Provide security and privacy training for personnel who have development-related roles.", iso: ["A.6.3"] },
  { taskCode: "PW.1.1", groupCode: "PW", title: "Secure architecture & design", description: "Create and maintain secure architecture and design, aligning with security requirements and using threat modeling.", iso: ["A.8.26", "A.8.27"] },
  { taskCode: "PW.2.1", groupCode: "PW", title: "Assess software security", description: "Determine whether the software is developed in-house or procured; identify and document security requirements for either case.", iso: ["A.8.26", "A.8.30"] },
  { taskCode: "PW.3.1", groupCode: "PW", title: "Threat modeling", description: "Use threat modeling to identify and prioritize potential threats and threat mitigations.", iso: ["A.8.26", "A.8.27"] },
  { taskCode: "PW.3.2", groupCode: "PW", title: "Threat modeling for response", description: "Use threat modeling to inform the review of event and incident response plans.", iso: ["A.5.24", "A.5.26"] },
  { taskCode: "PW.4.1", groupCode: "PW", title: "Secure coding practices", description: "Follow all secure coding practices that are appropriate to the development environment and language.", iso: ["A.8.28"] },
  { taskCode: "PW.4.3", groupCode: "PW", title: "Code review", description: "Perform code review on both human-written and generated code to identify and fix issues.", iso: ["A.8.28", "A.8.29"] },
  { taskCode: "PW.5.1", groupCode: "PW", title: "Integrity of source code", description: "Check in code to a version control system and ensure code integrity with secure settings.", iso: ["A.8.28", "A.8.33"] },
  { taskCode: "PW.5.2", groupCode: "PW", title: "Secure build process", description: "Configure the build process to take advantage of compiler/interpreter security features and verify dependencies.", iso: ["A.8.28", "A.8.29"] },
  { taskCode: "PW.5.3", groupCode: "PW", title: "Build artifacts", description: "Generate and verify build artifacts (binaries, SBOM, manifests) so their integrity is assured.", iso: ["A.8.28", "A.5.19"] },
  { taskCode: "PW.6.1", groupCode: "PW", title: "Re-evaluate artifacts", description: "Re-evaluate build artifacts after each code change to detect tampering and newly introduced vulnerabilities.", iso: ["A.8.29", "A.8.32"] },
  { taskCode: "PW.7.1", groupCode: "PW", title: "Root-cause analysis", description: "Perform and record root-cause analysis on vulnerabilities and defects.", iso: ["A.8.29", "A.5.25"] },
  { taskCode: "PW.7.2", groupCode: "PW", title: "Identify & remediate", description: "Identify and remediate vulnerabilities before release, using automated and manual testing.", iso: ["A.8.8", "A.8.29"] },
  { taskCode: "PW.8.1", groupCode: "PW", title: "Confirm remediation", description: "Confirm that vulnerabilities are remediated and re-test to verify.", iso: ["A.8.8", "A.8.29"] },
  { taskCode: "PW.8.2", groupCode: "PW", title: "Documentation review", description: "Review human-readable documentation and confirm it does not contain sensitive information.", iso: ["A.8.10", "A.8.2"] },
  { taskCode: "PW.9.1", groupCode: "PW", title: "Secure distribution plan", description: "Design, document, and maintain a plan for distributing and updating the software securely.", iso: ["A.8.9", "A.8.30"] },
  { taskCode: "PW.9.2", groupCode: "PW", title: "Secure deployment", description: "Configure the software and environment to run securely in production (secure defaults).", iso: ["A.8.9", "A.8.31"] },
  { taskCode: "PS.1.1", groupCode: "PS", title: "Protect code integrity", description: "Protect all forms of code (source, executables, config) from unauthorized access and tampering.", iso: ["A.8.2", "A.8.3", "A.8.33"] },
  { taskCode: "PS.2.1", groupCode: "PS", title: "Controlled deployment", description: "Ensure a controlled, auditable process for deploying code to production (separation of envs).", iso: ["A.8.31", "A.8.32"] },
  { taskCode: "PS.3.1", groupCode: "PS", title: "Secure artifact storage", description: "Store artifacts securely with controlled access, including backups.", iso: ["A.8.13", "A.8.2"] },
  { taskCode: "PS.4.1", groupCode: "PS", title: "Confidentiality of information", description: "Support the integrity and confidential storage of application information and secrets.", iso: ["A.8.12", "A.5.17"] },
  { taskCode: "RV.1.1", groupCode: "RV", title: "Identify & document vulnerabilities", description: "Identify and document potential vulnerabilities and their causes in all components.", iso: ["A.5.25", "A.8.8"] },
  { taskCode: "RV.2.1", groupCode: "RV", title: "Assess vulnerability severity", description: "Assess each vulnerability for severity and prioritize remediation.", iso: ["A.5.25", "A.8.8"] },
  { taskCode: "RV.3.1", groupCode: "RV", title: "Communicate & remediate", description: "Communicate vulnerability information to relevant parties and remediate in a timely manner.", iso: ["A.5.24", "A.5.26", "A.5.27"] },
] as const;

async function main() {
  for (const p of PROVIDERS) {
    await prisma.modelProvider.upsert({
      where: { code: p.code },
      update: { name: p.name, baseUrl: p.baseUrl, requiresKey: p.requiresKey, defaultModel: p.defaultModel },
      create: { ...p },
    });
  }

  // Stage system prompt templates live in the codebase (src/lib/stages.ts) to keep them maintainable.
  // The DB stores a placeholder; the engine composes prompts at runtime.
  for (const s of STAGES) {
    await prisma.stage.upsert({
      where: { code: s.code },
      update: {
        name: s.name,
        description: s.description,
        orderIndex: s.orderIndex,
        nistGroups: [...s.nistGroups],
        systemPromptTemplate: `runtime:${s.code}`,
      },
      create: {
        code: s.code,
        name: s.name,
        description: s.description,
        orderIndex: s.orderIndex,
        nistGroups: [...s.nistGroups],
        systemPromptTemplate: `runtime:${s.code}`,
      },
    });
  }

  for (const c of NIST_CONTROLS) {
    await prisma.nistSsdfControl.upsert({
      where: { taskCode: c.taskCode },
      update: {
        groupCode: c.groupCode,
        title: c.title,
        description: c.description,
        iso27001Mapping: c.iso,
      },
      create: {
        taskCode: c.taskCode,
        groupCode: c.groupCode,
        title: c.title,
        description: c.description,
        iso27001Mapping: c.iso,
      },
    });
  }

  console.log(`Seeded ${PROVIDERS.length} providers, ${STAGES.length} stages, ${NIST_CONTROLS.length} NIST SSDF controls.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());