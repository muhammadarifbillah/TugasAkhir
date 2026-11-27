/**
 * Declarative library of the eight website categories FUSE builds: three
 * page names each (searched by the shelf), headline features, stack and three
 * security checks. Pure data, no React and no stages.ts import (the dashboard
 * may import this; site-categories.test.ts cross-checks the NIST/ISO codes
 * against stages.ts).
 */
export type CategoryId = "marketplace" | "ecommerce" | "lms" | "saas" | "clinic" | "company" | "news" | "api";
export type ShelfId = "sell" | "learn" | "business" | "tech";
export type StageCode = "analysis" | "design" | "development" | "testing" | "handover";
export interface SitePage {
  id: string;
}
export interface SecurityCheck {
  id: string;
  stage: StageCode;
  nist: string;
  iso: string;
}
export interface SiteCategory {
  id: CategoryId;
  shelf: ShelfId;
  /** Dictionary keys: categories.items.<id>.pages.<id> */
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
    shelf: "sell",
    templates: [],
    pages: [{ id: "home" }, { id: "sellerStore" }, { id: "cartCheckout" }],
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
    shelf: "sell",
    templates: ["e-commerce"],
    pages: [{ id: "catalog" }, { id: "product" }, { id: "checkout" }],
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
    shelf: "learn",
    templates: ["lms"],
    pages: [{ id: "courses" }, { id: "classroom" }, { id: "quiz" }],
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
    shelf: "business",
    templates: ["saas"],
    pages: [{ id: "overview" }, { id: "team" }, { id: "billing" }],
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
    shelf: "business",
    templates: [],
    pages: [{ id: "doctors" }, { id: "booking" }, { id: "history" }],
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
    shelf: "business",
    templates: ["custom"],
    pages: [{ id: "home" }, { id: "services" }, { id: "contact" }],
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
    shelf: "learn",
    templates: [],
    pages: [{ id: "home" }, { id: "article" }, { id: "editor" }],
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
    shelf: "tech",
    templates: ["rest-api"],
    pages: [{ id: "reference" }, { id: "examples" }, { id: "keys" }],
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
