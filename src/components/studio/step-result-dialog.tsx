"use client";

import { useEffect, useId, useState } from "react";
import { Eye, FileText, Database, type LucideIcon } from "lucide-react";
import { FullscreenViewer } from "./fullscreen-viewer";
import { tabKeyNav } from "./tab-key-nav";
import { VisualCard } from "./visual-card";

export interface VisualCardDef {
  id: string;
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  fullscreenTitle: string;
  fullscreenContent: React.ReactNode;
}

interface StepResultDialogProps {
  title: string;
  stageName: string;
  subtitle?: string;
  overview: React.ReactNode;
  visual: React.ReactNode;
  visualCards?: VisualCardDef[];
  raw: React.ReactNode;
  maximized: boolean;
  onToggleMaximize: () => void;
  onFullscreenStateChange?: (open: boolean) => void;
  labels?: { overview: string; visual: string; raw: string };
}

export function StepResultDialog({
  title, overview, visual, visualCards, raw, maximized, onToggleMaximize, onFullscreenStateChange, labels,
}: StepResultDialogProps) {
  const tabIdBase = useId();
  const [activeTab, setActiveTab] = useState<"overview" | "visual" | "raw">("overview");
  const [fullscreenCard, setFullscreenCard] = useState<VisualCardDef | null>(null);

  useEffect(() => {
    onFullscreenStateChange?.(fullscreenCard !== null);
  }, [fullscreenCard, onFullscreenStateChange]);

  const tabs = [
    { id: "overview" as const, label: labels?.overview ?? "Overview", icon: FileText },
    { id: "visual" as const, label: labels?.visual ?? "Visual", icon: Eye },
    { id: "raw" as const, label: labels?.raw ?? "Raw Data", icon: Database },
  ];

  return (
    <div className="flex flex-col relative">
      {/* Tab bar */}
      <div
        role="tablist"
        aria-label={title}
        onKeyDown={(e) => tabKeyNav(e, tabs.map((t) => t.id), activeTab, setActiveTab)}
        className="flex items-center gap-1 border-b px-1 py-1"
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`${tabIdBase}-tab-${tab.id}`}
              aria-controls={`${tabIdBase}-panel`}
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" aria-hidden="true" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div
        role="tabpanel"
        id={`${tabIdBase}-panel`}
        aria-labelledby={`${tabIdBase}-tab-${activeTab}`}
        className="min-h-[200px] max-h-[70vh] overflow-y-auto p-3 sm:p-4"
      >
        {activeTab === "overview" && overview}
        {activeTab === "visual" && (
          visualCards && visualCards.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
              {visualCards.map((card) => (
                <VisualCard
                  key={card.id}
                  icon={card.icon}
                  iconColor={card.iconColor}
                  title={card.title}
                  description={card.description}
                  onClick={() => setFullscreenCard(card)}
                />
              ))}
            </div>
          ) : visual
        )}
        {activeTab === "raw" && raw}
      </div>

      {/* Fullscreen viewer — rendered INSIDE dialog, not outside */}
      {fullscreenCard && (
        <FullscreenViewer
          key={fullscreenCard.id}
          title={fullscreenCard.fullscreenTitle}
          onClose={() => setFullscreenCard(null)}
          maximized={maximized}
          onToggleMaximize={onToggleMaximize}
        >
          {fullscreenCard.fullscreenContent}
        </FullscreenViewer>
      )}
    </div>
  );
}
