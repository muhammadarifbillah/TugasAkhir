import { Braces, Building2, GraduationCap, LayoutDashboard, Newspaper, ShoppingBag, Stethoscope, Store, type LucideIcon } from "lucide-react";
import type { CategoryId } from "@/lib/site-categories";

const ICONS: Record<CategoryId, LucideIcon> = {
  marketplace: Store,
  ecommerce: ShoppingBag,
  lms: GraduationCap,
  saas: LayoutDashboard,
  clinic: Stethoscope,
  company: Building2,
  news: Newspaper,
  api: Braces,
};

export function CategoryIcon({ id, className }: { id: CategoryId; className?: string }) {
  const Icon = ICONS[id];
  return <Icon aria-hidden="true" className={className} />;
}
