import type z from "@deepseek-ai/schemastery";

/**
 * tdsh-emoji — 给 DeepSeek Harness (dsh) 回复自动添加标准 emoji 的提示词插件。
 */

export type EmojiMode = "off" | "auto" | "frequent";
export type EmojiPlacement = "inline" | "end";

export interface EmojiConfig {
  mode?: EmojiMode;
  placement?: EmojiPlacement;
  maxPerTurn?: number;
  customPrompt?: string;
  /** Legacy JSON import path; no longer used for saving. */
  settingsFile?: string;
  migrationVersion?: number;
}

export interface EmojiGroup {
  id: string;
  label: string;
  examples: string[];
}

export const Config: z;
export const name: string;
export const inject: string[];
export const SECTION_NAME: string;
export const SECTION_ORDER: number;
export const SETTINGS_NAMESPACE: string;
export const SETTINGS_FILE_NAME: string;
export const SETTINGS_FILE_SCHEMA_VERSION: number;
export const MODES: EmojiMode[];
export const PLACEMENTS: EmojiPlacement[];
export const MAX_EMOJI_PER_TURN: number;
export const DEFAULT_CONFIG: Required<Pick<EmojiConfig, "mode" | "placement" | "maxPerTurn" | "customPrompt">>;
export const CATALOG: readonly EmojiGroup[];

export function normalizeConfig(config?: EmojiConfig): Required<Pick<EmojiConfig, "mode" | "placement" | "maxPerTurn" | "customPrompt">>;

/** mode=off 时返回空字符串（不会注入任何内容）。 */
export function buildGuidance(config?: EmojiConfig): string;

/** Cordis 插件入口。 */
export function apply(ctx: any, config?: EmojiConfig): void;

declare const plugin: { name: string; inject: string[]; Config: z; apply: typeof apply };
export default plugin;
