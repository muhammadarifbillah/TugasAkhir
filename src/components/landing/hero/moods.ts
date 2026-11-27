/**
 * The eight panel moods of herosection.jpeg, left to right. Hero-only colours (owner decision 2026-11-27):
 * this folder is exempt from the five-colour palette guard.
 */
export type Scenery = "waterfall" | "beach" | "meadow" | "savanna" | "underwater" | "forest" | "dawn" | "winter";

export interface HeroMood {
  id: string;
  scenery: Scenery;
  /** Sky gradient, top to horizon. */
  sky: readonly [string, string];
  /** Sun, moon or glow colour. */
  light: string;
  /** Land or sea-floor colour. */
  ground: string;
  /** Water colour (sea, lake, river), or the ground again when there is none. */
  water: string;
  /** Trees, rocks and leaves. */
  silhouette: string;
  /** Logo block and CTA pill of the website skeleton. */
  accent: string;
}

export const HERO_MOODS: readonly HeroMood[] = [
  { id: "whiteWaterfall", scenery: "waterfall", sky: ["#6f8f8c", "#cfe3dc"], light: "#ffffff", ground: "#1d2a26", water: "#e9f4f2", silhouette: "#0b1411", accent: "#2f6f63" },
  { id: "blueOcean", scenery: "beach", sky: ["#38b6e8", "#bfeaf7"], light: "#fffbe6", ground: "#e9d9b0", water: "#1f8fc4", silhouette: "#0f2a1c", accent: "#1677b3" },
  { id: "greenMeadows", scenery: "meadow", sky: ["#5aa6e0", "#d6eef7"], light: "#fff6cf", ground: "#5f9a3a", water: "#3f7d2a", silhouette: "#1f3d17", accent: "#3d7d2a" },
  { id: "redSavanna", scenery: "savanna", sky: ["#3b1f3f", "#f0794a"], light: "#ffd08a", ground: "#4a2a1c", water: "#7a3a22", silhouette: "#0c0705", accent: "#c4482a" },
  { id: "blueDeep", scenery: "underwater", sky: ["#0a5fd6", "#0a2a7a"], light: "#8fe3ff", ground: "#06194f", water: "#0b3fa3", silhouette: "#041033", accent: "#1d8bff" },
  { id: "orangeSunset", scenery: "forest", sky: ["#4a2408", "#ff9a2e"], light: "#ffd27a", ground: "#2a1405", water: "#a8520f", silhouette: "#150a03", accent: "#e0731a" },
  { id: "violetDawn", scenery: "dawn", sky: ["#3a2a6e", "#e7a0c8"], light: "#ffe0f0", ground: "#2a1f45", water: "#6a4a9a", silhouette: "#120d24", accent: "#8a4fc4" },
  { id: "whiteWinter", scenery: "winter", sky: ["#9fc3dc", "#eef6fb"], light: "#ffffff", ground: "#e8f1f7", water: "#c6dceb", silhouette: "#4f6b80", accent: "#4a86b0" },
];
