/**
 * Declarative library of the eight website categories FUSE builds: three
 * illustrated pages each, headline features, stack and three security checks.
 * Pure data, no React and no stages.ts import (the dashboard may import this;
 * site-categories.test.ts cross-checks the NIST/ISO codes against stages.ts).
 */
export const BLOCK_KINDS = ["nav", "hero", "cards", "list", "form", "table", "chart", "sidebar", "cart", "player", "schedule", "code"] as const;
export type BlockKind = (typeof BLOCK_KINDS)[number];
export type CategoryId = "marketplace" | "ecommerce" | "lms" | "saas" | "clinic" | "company" | "news" | "api";
export type ShelfId = "sell" | "learn" | "business" | "tech";
export type StageCode = "analysis" | "design" | "development" | "testing" | "handover";
export interface SitePage {
  id: string;
  blocks: readonly BlockKind[];
}
export interface SecurityCheck {
  id: string;
  stage: StageCode;
  nist: string;
  iso: string;
}
export interface SiteCategory {
  id: CategoryId;
  hue: number;
  shelf: ShelfId;
  pages: readonly [SitePage, SitePage, SitePage];
  /** Dictionary keys: categories.items.<id>.features.<key> */
  features: readonly [string, string, string];
  /** Technology names (proper nouns, not translated). */
  stack: readonly string[];
  checks: readonly [SecurityCheck, SecurityCheck, SecurityCheck];
  /** project.template values that map to this category. */
  templates: readonly string[];
}

export const SITE_CATEGORIES: readonly SiteCategory[] = [
  {
    id: "marketplace",
    hue: 24,
    shelf: "sell",
    templates: [],
    pages: [
      { id: "home", blocks: ["nav", "hero", "cards"] },
      { id: "sellerStore", blocks: ["nav", "sidebar", "cards"] },
      { id: "cartCheckout", blocks: ["nav", "cart", "form"] },
    ],
    features: ["multiSeller", "reviews", "payments"],
    stack: ["Next.js", "PostgreSQL", "Prisma"],
    checks: [
      { id: "orderAccess", stage: "design", nist: "PW.1.2", iso: "A.5.15" },
      { id: "paymentWebhook", stage: "development", nist: "PW.5.1", iso: "A.8.28" },
      { id: "reviewXss", stage: "testing", nist: "RV.1.1", iso: "A.8.29" },
    ],
  },
  {
    id: "ecommerce",
    hue: 340,
    shelf: "sell",
    templates: ["e-commerce"],
    pages: [
      { id: "catalog", blocks: ["nav", "sidebar", "cards"] },
      { id: "product", blocks: ["nav", "hero", "cards"] },
      { id: "checkout", blocks: ["nav", "form", "cart"] },
    ],
    features: ["catalogSearch", "cart", "orders"],
    stack: ["Next.js", "PostgreSQL", "Tailwind CSS"],
    checks: [
      { id: "clientPrice", stage: "development", nist: "PW.5.1", iso: "A.8.28" },
      { id: "checkoutCsrf", stage: "testing", nist: "RV.1.2", iso: "A.8.29" },
      { id: "buyerData", stage: "analysis", nist: "PO.1.2", iso: "A.5.34" },
    ],
  },
  {
    id: "lms",
    hue: 265,
    shelf: "learn",
    templates: ["lms"],
    pages: [
      { id: "courses", blocks: ["nav", "hero", "cards"] },
      { id: "classroom", blocks: ["nav", "sidebar", "player"] },
      { id: "quiz", blocks: ["nav", "list", "form"] },
    ],
    features: ["courses", "video", "quizzes"],
    stack: ["Next.js", "PostgreSQL", "Prisma"],
    checks: [
      { id: "paidContent", stage: "design", nist: "PW.1.2", iso: "A.5.15" },
      { id: "quizIntegrity", stage: "development", nist: "PW.5.1", iso: "A.8.28" },
      { id: "fileUpload", stage: "testing", nist: "RV.1.1", iso: "A.8.29" },
    ],
  },
  {
    id: "saas",
    hue: 205,
    shelf: "business",
    templates: ["saas"],
    pages: [
      { id: "overview", blocks: ["sidebar", "chart", "cards"] },
      { id: "team", blocks: ["sidebar", "table"] },
      { id: "billing", blocks: ["sidebar", "cards", "table"] },
    ],
    features: ["tenants", "roles", "billing"],
    stack: ["Next.js", "PostgreSQL", "Prisma"],
    checks: [
      { id: "tenantIsolation", stage: "design", nist: "PW.1.3", iso: "A.8.27" },
      { id: "roleAccess", stage: "design", nist: "PW.1.2", iso: "A.5.15" },
      { id: "secretsInCode", stage: "development", nist: "PS.1.1", iso: "A.8.28" },
    ],
  },
  {
    id: "clinic",
    hue: 160,
    shelf: "business",
    templates: [],
    pages: [
      { id: "doctors", blocks: ["nav", "schedule", "cards"] },
      { id: "booking", blocks: ["nav", "form"] },
      { id: "history", blocks: ["nav", "sidebar", "table"] },
    ],
    features: ["schedule", "appointments", "records"],
    stack: ["Next.js", "PostgreSQL", "Tailwind CSS"],
    checks: [
      { id: "healthData", stage: "analysis", nist: "PO.1.2", iso: "A.5.34" },
      { id: "recordAuth", stage: "design", nist: "PW.1.2", iso: "A.5.15" },
      { id: "formRateLimit", stage: "development", nist: "PW.5.1", iso: "A.8.28" },
    ],
  },
  {
    id: "company",
    hue: 45,
    shelf: "business",
    templates: ["custom"],
    pages: [
      { id: "home", blocks: ["nav", "hero", "cards"] },
      { id: "services", blocks: ["nav", "list", "cards"] },
      { id: "contact", blocks: ["nav", "form", "list"] },
    ],
    features: ["profile", "services", "contactForm"],
    stack: ["Next.js", "Tailwind CSS"],
    checks: [
      { id: "contactSpam", stage: "development", nist: "PW.5.1", iso: "A.8.28" },
      { id: "securityHeaders", stage: "handover", nist: "PW.9.2", iso: "A.8.9" },
      { id: "outdatedDeps", stage: "testing", nist: "RV.1.1", iso: "A.8.8" },
    ],
  },
  {
    id: "news",
    hue: 0,
    shelf: "learn",
    templates: [],
    pages: [
      { id: "home", blocks: ["nav", "hero", "list"] },
      { id: "article", blocks: ["nav", "hero", "list"] },
      { id: "editor", blocks: ["sidebar", "form", "table"] },
    ],
    features: ["articles", "editorRoles", "media"],
    stack: ["Next.js", "PostgreSQL", "Prisma"],
    checks: [
      { id: "contentXss", stage: "development", nist: "PW.5.1", iso: "A.8.28" },
      { id: "editorRole", stage: "design", nist: "PW.1.2", iso: "A.5.15" },
      { id: "imageUpload", stage: "testing", nist: "RV.1.1", iso: "A.8.29" },
    ],
  },
  {
    id: "api",
    hue: 130,
    shelf: "tech",
    templates: ["rest-api"],
    pages: [
      { id: "reference", blocks: ["sidebar", "list", "code"] },
      { id: "examples", blocks: ["sidebar", "code"] },
      { id: "keys", blocks: ["sidebar", "table", "form"] },
    ],
    features: ["endpoints", "apiKeys", "rateLimits"],
    stack: ["Node.js", "Express", "PostgreSQL"],
    checks: [
      { id: "tokenAuth", stage: "design", nist: "PW.1.2", iso: "A.8.5" },
      { id: "rateLimit", stage: "design", nist: "PW.1.1", iso: "A.8.27" },
      { id: "inputValidation", stage: "development", nist: "PW.5.1", iso: "A.8.28" },
    ],
  },
];

const COMPANY = SITE_CATEGORIES.find((c) => c.id === "company")!;

/** Category for a project.template value; unknown, null, undefined and "custom" fall back to company. */
export function categoryForTemplate(template: string | null | undefined): SiteCategory {
  return (template && SITE_CATEGORIES.find((c) => c.templates.includes(template))) || COMPANY;
}
