"use client";

import { type LucideIcon } from "lucide-react";

interface VisualCardProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  onClick: () => void;
}

export function VisualCard({
  icon: Icon,
  iconColor = "text-primary",
  title,
  description,
  onClick,
}: VisualCardProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start rounded-lg border p-3 sm:p-4 text-left
                 hover:bg-muted hover:border-primary/30 transition-all w-full
                 active:scale-[0.98] min-h-[100px] sm:min-h-[120px]"
    >
      <Icon className={`w-7 h-7 sm:w-8 sm:h-8 ${iconColor} mb-2 shrink-0`} />
      <h4 className="font-semibold text-xs sm:text-sm leading-tight">{title}</h4>
      <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-2">
        {description}
      </p>
    </button>
  );
}