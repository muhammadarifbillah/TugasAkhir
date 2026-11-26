import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const PROVIDERS = [
  { code: "openai", name: "OpenAI", baseUrl: "https://api.openai.com/v1", requiresKey: true, defaultModel: "gpt-4o-mini" },
  { code: "openrouter", name: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", requiresKey: true, defaultModel: "openrouter/auto" },
  { code: "anthropic", name: "Anthropic", baseUrl: "https://api.anthropic.com/v1", requiresKey: true, defaultModel: "claude-3-5-sonnet-latest" },
  { code: "deepseek", name: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", requiresKey: true, defaultModel: "deepseek-flash" },
  { code: "ollama", name: "Ollama (local)", baseUrl: "http://localhost:11434/v1", requiresKey: false, defaultModel: "llama3.2" },
  { code: "gemini", name: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai", requiresKey: true, defaultModel: "gemini-flash-latest" },
  { code: "omniroute", name: "OmniRoute", baseUrl: "https://router.boilingac.id/v1", requiresKey: true, defaultModel: "opencode-go/deepseek-v4.1-flash" },
  { code: "groq", name: "Groq", baseUrl: "https://api.groq.com/openai/v1", requiresKey: true, defaultModel: "llama-3.3-70b-versatile" },
  { code: "mistral", name: "Mistral AI", baseUrl: "https://api.mistral.ai/v1", requiresKey: true, defaultModel: "mistral-large-latest" },
  { code: "xai", name: "xAI (Grok)", baseUrl: "https://api.x.ai/v1", requiresKey: true, defaultModel: "grok-2-latest" },
  { code: "together", name: "Together AI", baseUrl: "https://api.together.xyz/v1", requiresKey: true, defaultModel: "meta-llama/Llama-3.3-70B-Instruct-Turbo" },
  { code: "cerebras", name: "Cerebras", baseUrl: "https://api.cerebras.ai/v1", requiresKey: true, defaultModel: "llama-3.3-70b" },
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

// NIST SP 800-218 (SSDF v1.1) — full practice/task set with an ISO 27001:2022
// Annex A crosswalk. Task codes and titles follow the official SSDF table
// (nist.sp.800-218.ssdf-table.xlsx); descriptions are condensed paraphrases.
const NIST_CONTROLS = [
  // PO — Prepare the Organization
  { taskCode: "PO.1.1", groupCode: "PO", title: "Define security requirements for software development", description: "Identify and document security requirements for the organization's software development infrastructure and processes, and maintain them over time.", iso: ["A.5.1", "A.5.8"] },
  { taskCode: "PO.1.2", groupCode: "PO", title: "Define security requirements for software", description: "Identify, document and maintain all security requirements for organization-developed software, including security architecture and functionality.", iso: ["A.5.8", "A.8.26", "A.5.34"] },
  { taskCode: "PO.1.3", groupCode: "PO", title: "Communicate requirements to third parties", description: "Communicate software security requirements to all third parties providing commercial software components.", iso: ["A.5.19", "A.5.20", "A.5.21"] },
  { taskCode: "PO.2.1", groupCode: "PO", title: "Implement roles and responsibilities", description: "Create roles and alter responsibilities so all parts of the SDLC are covered.", iso: ["A.5.2", "A.5.3"] },
  { taskCode: "PO.2.2", groupCode: "PO", title: "Provide role-based training", description: "Provide role-based training for personnel whose responsibilities contribute to secure development.", iso: ["A.6.3"] },
  { taskCode: "PO.2.3", groupCode: "PO", title: "Obtain management commitment", description: "Obtain top-level management commitment to secure software development.", iso: ["A.5.1", "A.5.4"] },
  { taskCode: "PO.3.1", groupCode: "PO", title: "Specify toolchain tools", description: "Specify which tools or tool types must be included in each toolchain and how components integrate.", iso: ["A.8.25", "A.8.9"] },
  { taskCode: "PO.3.2", groupCode: "PO", title: "Operate and maintain toolchains", description: "Follow recommended security practices to deploy, operate and maintain tools and toolchains.", iso: ["A.8.9", "A.8.32"] },
  { taskCode: "PO.3.3", groupCode: "PO", title: "Generate toolchain artifacts", description: "Configure tools to generate artifacts that demonstrate secure development practice support.", iso: ["A.8.15", "A.5.33"] },
  { taskCode: "PO.4.1", groupCode: "PO", title: "Define security check criteria", description: "Define criteria for software security checks and track them throughout the SDLC.", iso: ["A.8.8", "A.8.29"] },
  { taskCode: "PO.4.2", groupCode: "PO", title: "Gather and safeguard check data", description: "Implement processes and mechanisms to gather and safeguard information supporting the criteria.", iso: ["A.8.15", "A.5.33"] },
  { taskCode: "PO.5.1", groupCode: "PO", title: "Separate and protect environments", description: "Separate and protect each environment involved in software development.", iso: ["A.8.22", "A.8.31"] },
  { taskCode: "PO.5.2", groupCode: "PO", title: "Harden development endpoints", description: "Secure and harden development endpoints using a risk-based approach.", iso: ["A.8.1", "A.5.15"] },

  // PS — Protect the Software
  { taskCode: "PS.1.1", groupCode: "PS", title: "Protect code from unauthorized access", description: "Store all forms of code based on least privilege so only authorized personnel and tools have access.", iso: ["A.8.2", "A.8.3", "A.8.4"] },
  { taskCode: "PS.2.1", groupCode: "PS", title: "Verify release integrity", description: "Make software integrity verification information available to acquirers.", iso: ["A.8.24"] },
  { taskCode: "PS.3.1", groupCode: "PS", title: "Archive each release", description: "Securely archive the files and supporting data required for each software release.", iso: ["A.8.13", "A.8.10"] },
  { taskCode: "PS.3.2", groupCode: "PS", title: "Share provenance data (SBOM)", description: "Collect, safeguard, maintain and share provenance data for all components of each release.", iso: ["A.5.19", "A.5.21", "A.8.24"] },

  // PW — Produce Well-Secured Software
  { taskCode: "PW.1.1", groupCode: "PW", title: "Risk modeling (threat modeling)", description: "Use risk modeling such as threat modeling or attack surface mapping to assess security risk.", iso: ["A.8.26", "A.8.27"] },
  { taskCode: "PW.1.2", groupCode: "PW", title: "Track security requirements and risks", description: "Track and maintain the software's security requirements, risks and design decisions.", iso: ["A.8.26", "A.8.25"] },
  { taskCode: "PW.1.3", groupCode: "PW", title: "Standardized security features", description: "Build in support for standardized security features and services instead of proprietary implementations.", iso: ["A.8.26", "A.8.24"] },
  { taskCode: "PW.2.1", groupCode: "PW", title: "Review the software design", description: "Have qualified people or automated processes review the design to confirm it meets security requirements.", iso: ["A.8.26", "A.8.27", "A.8.29"] },
  { taskCode: "PW.4.1", groupCode: "PW", title: "Acquire well-secured components", description: "Acquire and maintain well-secured third-party software components.", iso: ["A.5.19", "A.5.21", "A.8.24"] },
  { taskCode: "PW.4.2", groupCode: "PW", title: "Create in-house components securely", description: "Create and maintain in-house components following secure SDLC processes.", iso: ["A.8.25", "A.8.28"] },
  { taskCode: "PW.4.4", groupCode: "PW", title: "Verify third-party components", description: "Verify that acquired third-party components comply with requirements throughout their lifecycles.", iso: ["A.5.21", "A.8.8", "A.8.29"] },
  { taskCode: "PW.5.1", groupCode: "PW", title: "Follow secure coding practices", description: "Follow all secure coding practices appropriate to the development languages and environment.", iso: ["A.8.28"] },
  { taskCode: "PW.6.1", groupCode: "PW", title: "Use secure build tooling", description: "Use compiler, interpreter and build tools that offer features to improve executable security.", iso: ["A.8.9", "A.8.25"] },
  { taskCode: "PW.6.2", groupCode: "PW", title: "Configure build tool security", description: "Determine and implement approved security-related configurations for build tools.", iso: ["A.8.9", "A.8.28"] },
  { taskCode: "PW.7.1", groupCode: "PW", title: "Determine code review/analysis approach", description: "Determine whether code review and/or code analysis should be used.", iso: ["A.8.29", "A.8.28"] },
  { taskCode: "PW.7.2", groupCode: "PW", title: "Perform code review and analysis", description: "Perform code review and analysis and record and triage all issues and remediations.", iso: ["A.8.28", "A.8.29"] },
  { taskCode: "PW.8.1", groupCode: "PW", title: "Determine executable testing approach", description: "Determine whether executable code testing should be performed and which types to use.", iso: ["A.8.29"] },
  { taskCode: "PW.8.2", groupCode: "PW", title: "Perform and document testing", description: "Scope, design and perform testing and document the results and remediations.", iso: ["A.8.29", "A.8.8"] },
  { taskCode: "PW.9.1", groupCode: "PW", title: "Define secure baseline settings", description: "Define a secure baseline for each security-relevant setting so defaults are secure.", iso: ["A.8.9", "A.8.28"] },
  { taskCode: "PW.9.2", groupCode: "PW", title: "Implement and document default settings", description: "Implement default settings and document each setting for software administrators.", iso: ["A.8.9", "A.8.31"] },

  // RV — Respond to Vulnerabilities
  { taskCode: "RV.1.1", groupCode: "RV", title: "Gather vulnerability information", description: "Gather information on potential vulnerabilities and investigate all credible reports.", iso: ["A.5.7", "A.8.8"] },
  { taskCode: "RV.1.2", groupCode: "RV", title: "Review code for vulnerabilities", description: "Review, analyze and/or test code to identify or confirm previously undetected vulnerabilities.", iso: ["A.8.8", "A.8.29"] },
  { taskCode: "RV.1.3", groupCode: "RV", title: "Vulnerability disclosure policy", description: "Maintain a vulnerability disclosure and remediation policy with the roles and processes to support it.", iso: ["A.5.24", "A.5.26", "A.5.27"] },
  { taskCode: "RV.2.1", groupCode: "RV", title: "Assess and prioritize vulnerabilities", description: "Analyze each vulnerability to gather enough risk information to plan remediation.", iso: ["A.5.25", "A.8.8"] },
  { taskCode: "RV.2.2", groupCode: "RV", title: "Plan and implement risk responses", description: "Plan and implement risk-based responses for each vulnerability.", iso: ["A.8.8", "A.8.32"] },
  { taskCode: "RV.3.1", groupCode: "RV", title: "Root cause analysis", description: "Analyze identified vulnerabilities to determine their root causes.", iso: ["A.5.25", "A.5.27"] },
  { taskCode: "RV.3.2", groupCode: "RV", title: "Analyze root cause patterns", description: "Analyze root causes over time to identify recurring patterns.", iso: ["A.5.27", "A.8.8"] },
  { taskCode: "RV.3.3", groupCode: "RV", title: "Eradicate vulnerability classes", description: "Review the software for similar vulnerabilities and proactively fix the class.", iso: ["A.8.8", "A.8.29"] },
  { taskCode: "RV.3.4", groupCode: "RV", title: "Improve the SDLC process", description: "Review and update the SDLC process to prevent root causes recurring.", iso: ["A.8.25", "A.8.32"] },
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

  // Prune controls that are no longer part of the SSDF set (e.g. codes removed
  // between versions), but only when nothing references them so we never break
  // existing projects' recommendations or traceability links.
  const codes = NIST_CONTROLS.map((c) => c.taskCode);
  const pruned = await prisma.nistSsdfControl.deleteMany({
    where: {
      taskCode: { notIn: codes },
      recommendations: { none: {} },
      requirements: { none: {} },
    },
  });

  console.log(
    `Seeded ${PROVIDERS.length} providers, ${STAGES.length} stages, ${NIST_CONTROLS.length} NIST SSDF controls.` +
      (pruned.count > 0 ? ` Pruned ${pruned.count} obsolete control(s).` : ""),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());