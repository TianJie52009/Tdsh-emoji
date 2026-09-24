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
}

export interface EmojiGroup {
  id: string;
  label: string;
  examples: string[];
}

export const name: string;
export const inject: string[];
export const SECTION_NAME: string;
export const SECTION_ORDER: number;
export const SETTINGS_NAMESPACE: string;
export const SETTINGS_ROUTE: string;
export const SETTINGS_FILE_NAME: string;
export const SETTINGS_FILE_SCHEMA_VERSION: number;
export const MODES: EmojiMode[];
export const PLACEMENTS: EmojiPlacement[];
export const MAX_EMOJI_PER_TURN: number;
export const DEFAULT_CONFIG: Required<EmojiConfig>;
export const CATALOG: readonly EmojiGroup[];

export function normalizeConfig(config?: EmojiConfig): Required<EmojiConfig>;

/** mode=off 时返回空字符串（不会注入任何内容）。 */
export function buildGuidance(config?: EmojiConfig): string;

/** Cordis 插件入口。 */
export function apply(ctx: any, config?: EmojiConfig): void;

declare const plugin: { name: string; inject: string[]; apply: typeof apply };
export default plugin;
