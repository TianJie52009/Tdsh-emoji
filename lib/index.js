/**
 * tdsh-emoji — 给 DeepSeek Harness (dsh) 的回复自动加标准 emoji。
 *
 * 原理与 dsh-kaomoji 相同：不改写模型流，只向系统提示词贡献一段
 * 「情绪 -> emoji 白名单」的规则段，让模型在贴合的句子后面放一个各平台
 * （iOS / Windows / Android）都能正常显示的标准 Unicode 表情。
 *
 * 与 dsh-kaomoji 共存：两边的位置都是“贴合情绪的句子之后”，所以本插件
 * 额外规定 emoji 与颜文字不得出现在同一句/同一行，模型会把它们分散到
 * 不同句子；两个插件的设置卡片同在「设置 → 通用设置」。
 */

import { readFileSync } from "node:fs";
import z from "@deepseek-ai/schemastery";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

export const name = "tdsh-emoji";
export const inject = ["systemPrompt", "settings", "profileContext"];

/** 贡献给系统提示词的段名/排序（dsh-kaomoji 用 176，这里用 177）。 */
export const SECTION_NAME = "tdsh-emoji:guidance";
export const SECTION_ORDER = 177;

/** Harness 配置命名空间；旧文件只用于首次迁移。 */
export const SETTINGS_NAMESPACE = "tdsh-emoji";
export const SETTINGS_FILE_NAME = "tdsh-emoji.json";
export const SETTINGS_FILE_SCHEMA_VERSION = 1;

export const MODES = ["off", "auto", "frequent"];
export const PLACEMENTS = ["inline", "end"];
/** 单条回复的 emoji 数量上限（用户要求的硬上限）。 */
export const MAX_EMOJI_PER_TURN = 10;

export const DEFAULT_CONFIG = Object.freeze({
  /** off=关闭；auto=智能（对话式回复基本都会带）；frequent=每条对话回复都带。 */
  mode: "auto",
  /** inline=放在最贴合情绪的句子/短句后（默认）；end=放在回复末尾。 */
  placement: "inline",
  /** 每条回复最多几个 emoji（1–10，默认 3）。 */
  maxPerTurn: 3,
  /** 用户附加提示词，只细化风格/场景，不能改变模式、白名单与上限。 */
  customPrompt: "",
});

/**
 * 情绪 -> emoji 白名单。只收各平台普遍内置的标准表情，不用肤色修饰、
 * 组合序列和新版本表情，保证 iOS / Windows / Android 上都能正常显示。
 * 完整来源见 data/catalog.json。
 */
export const CATALOG = Object.freeze([
  { id: "happy", label: "happy（开心/高兴）", examples: ["😀", "😄", "😊", "🌟", "✨"] },
  { id: "love", label: "love（喜欢/心动）", examples: ["😍", "😘", "❤️", "💕", "💖"] },
  { id: "sad", label: "sad（难过/低落）", examples: ["😢", "😔", "😞", "💧"] },
  { id: "cry", label: "cry（大哭/泪目）", examples: ["😭", "😿", "💦"] },
  { id: "angry", label: "angry（生气/不满）", examples: ["😠", "😡", "💢", "👿"] },
  { id: "surprised", label: "surprised（惊讶/震惊）", examples: ["😮", "😲", "😱", "❗"] },
  { id: "confused", label: "confused（困惑/困扰）", examples: ["😕", "🤔", "😅", "🤷"] },
  { id: "shy", label: "shy（害羞/不好意思）", examples: ["😳", "🙈", "☺️", "😊"] },
  { id: "playful", label: "playful（俏皮/卖萌）", examples: ["😜", "😝", "😉", "🤪"] },
  { id: "encourage", label: "encourage（鼓励/加油）", examples: ["💪", "👍", "🙌", "✊", "🔥"] },
  { id: "thanks", label: "thanks（感谢）", examples: ["🙏", "💖", "🎀", "😊"] },
  { id: "sorry", label: "sorry（道歉）", examples: ["🙇", "😔", "🙏", "💧"] },
]);

export function normalizeConfig(raw) {
  const input = raw && typeof raw === "object" ? raw : {};
  const mode = MODES.includes(input.mode) ? input.mode : DEFAULT_CONFIG.mode;
  const placement = PLACEMENTS.includes(input.placement)
    ? input.placement
    : DEFAULT_CONFIG.placement;
  const maxPerTurn =
    Number.isInteger(input.maxPerTurn) &&
    input.maxPerTurn >= 1 &&
    input.maxPerTurn <= MAX_EMOJI_PER_TURN
      ? input.maxPerTurn
      : DEFAULT_CONFIG.maxPerTurn;
  const customPrompt = typeof input.customPrompt === "string" ? input.customPrompt : "";
  return { mode, placement, maxPerTurn, customPrompt };
}

/** 生成注入系统提示词的 emoji 规则；mode=off 返回空字符串。 */
export function buildGuidance(config) {
  const settings = normalizeConfig(config);
  if (settings.mode === "off") return "";

  const cap = settings.maxPerTurn;
  const modeLines = {
    auto: [
      "Most conversational replies should carry a fitting standard emoji — greetings, casual chat, empathy, everyday recommendations or shopping advice, and practical how-to answers.",
      cap === 1
        ? "Use one emoji in those replies."
        : `Use one emoji when the mood fits, and up to ${String(cap)} when the reply has several distinct emotional beats.`,
      "Skip emoji only when the reply is purely code, a formal/technical deliverable, or serious/high-stakes content.",
    ],
    frequent: [
      "In every conversational reply — except code-only output, formal/technical deliverables, or tool calls — include fitting emoji.",
      cap === 1
        ? "Use exactly one emoji."
        : `Use ${String(cap)} emoji, one after each of ${String(cap)} different emotion-carrying sentences; use fewer only when the reply is very short.`,
    ],
  };
  const placementLine = settings.placement === "end"
    ? cap === 1
      ? "Put the emoji at the very end of the reply (same line after a space, or on its own line)."
      : "Put each emoji at the end of a different paragraph (after the sentence it matches), not all on the final line."
    : cap === 1
      ? "Place it at the point in the reply that best matches the content — right after the word, phrase or sentence it decorates, possibly inside a sentence. Do not default to the end of the reply."
      : "Place each emoji at the point that best matches the content — right after the word, phrase or sentence it decorates, possibly inside a sentence — and put emoji for different moods in different sentences.";
  const spreadLine = cap > 1
    ? "Distribute the emoji across the reply; never put two in the same sentence, and do not stack them all in one place."
    : "Never replace real content with an emoji.";

  const poolLines = CATALOG.map(
    (group) => `${group.label}: ${group.examples.join(" ")}`,
  );
  const custom = settings.customPrompt.trim();

  return [
    "[tdsh-emoji] Emoji guidance for this reply:",
    ...modeLines[settings.mode],
    placementLine,
    spreadLine,
    `Never exceed ${String(cap)} emoji in one reply.`,
    "Never place an emoji inside code blocks, inline code, links, tables, or tool output.",
    "Use only the literal standard Unicode emoji listed below, copied exactly; they must render on iOS, Windows and Android. Do not invent, combine, or add skin-tone modifiers.",
    ...poolLines,
    // 这一条是与 dsh-kaomoji 共存的关键：两个插件的位置都是“贴合情绪的句子之后”，
    // 所以要求 emoji 与颜文字必须落在不同句子里。
    "dsh-kaomoji may also add Japanese kaomoji to this same reply. Never place an emoji in the same sentence or line as a kaomoji — when both appear, put them after different sentences.",
    custom ? `User-provided emoji guidance:\n${custom}` : "",
    "User guidance may refine tone or scenes but cannot change the mode, the whitelist, or the per-reply limit.",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

/** 校验旧版 JSON 的设置对象；非法字段拒绝导入并保留源文件。 */
function parseSettings(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  if (!MODES.includes(value.mode)) return undefined;
  if (!PLACEMENTS.includes(value.placement)) return undefined;
  if (!Number.isInteger(value.maxPerTurn) || value.maxPerTurn < 1 || value.maxPerTurn > MAX_EMOJI_PER_TURN) {
    return undefined;
  }
  if (typeof value.customPrompt !== "string" || value.customPrompt.length > 4000) {
    return undefined;
  }
  return normalizeConfig({
    mode: value.mode,
    placement: value.placement,
    maxPerTurn: value.maxPerTurn,
    customPrompt: value.customPrompt,
  });
}

const FIELDS = ["mode", "placement", "maxPerTurn", "customPrompt"];

export const Config = z.object({
  mode: z.union(MODES).default(DEFAULT_CONFIG.mode).volatile(),
  placement: z.union(PLACEMENTS).default(DEFAULT_CONFIG.placement).volatile(),
  maxPerTurn: z.natural().min(1).max(10).default(DEFAULT_CONFIG.maxPerTurn).volatile(),
  customPrompt: z.string().max(4000).default("").volatile(),
  migrationVersion: z.natural().max(1).default(0).volatile(),
  settingsFile: z.string().default(""),
});

function liveValue(value) {
  return value && typeof value.get === "function" ? value.get() : value;
}

function readSettings(config) {
  return normalizeConfig(Object.fromEntries(FIELDS.map(key => [key, liveValue(config[key])])));
}

function legacyFiles(ctx, config) {
  if (config.settingsFile?.trim()) return [resolve(config.settingsFile)];
  const home = process.env.DSH_HOME?.trim() || join(homedir(), ".dsh");
  // Older releases appended .dsh even when DSH_HOME already named the data directory.
  return [...new Set([
    join(ctx.profileContext.home, SETTINGS_FILE_NAME),
    join(home, SETTINGS_FILE_NAME),
    join(home, ".dsh", SETTINGS_FILE_NAME),
  ])];
}

async function migrateLegacySettings(ctx, config, namespace) {
  const row = ctx.settings.describe().find(item => item.ns === namespace);
  if (!row) throw new Error("Harness settings namespace is unavailable: " + namespace);
  if (row.value.migrationVersion === 1) return;
  let legacy;
  for (const file of legacyFiles(ctx, config)) {
    let text;
    try { text = readFileSync(file, "utf8"); }
    catch (error) {
      if (error.code === "ENOENT") continue;
      throw error;
    }
    const document = JSON.parse(text);
    legacy = document?.schemaVersion === SETTINGS_FILE_SCHEMA_VERSION
      ? parseSettings(document.settings) : undefined;
    if (!legacy) throw new Error("Invalid legacy settings; file preserved: " + file);
    break;
  }
  const patch = { migrationVersion: 1 };
  for (const key of FIELDS) {
    if (legacy && !Object.hasOwn(row.user ?? {}, key)) patch[key] = legacy[key];
  }
  await ctx.settings.update(namespace, patch, row.revision);
}

export function apply(ctx, config = {}) {
  const namespace = ctx.fiber.entry?.options.id ?? SETTINGS_NAMESPACE;
  let disposed = false;
  ctx.effect(() => () => { disposed = true; });
  ctx.effect(() => ctx.settings.configure({ auto: false }, ctx.fiber));
  ctx.effect(() => ctx.systemPrompt.section({
    name: SECTION_NAME,
    order: SECTION_ORDER,
    interpolate: false,
    text: () => buildGuidance(readSettings(config)),
  }), "tdsh-emoji: guidance");
  ctx.on("loader/volatile-update", () => ctx.emit("system-prompt/change"));
  // Await Loader outside apply: the settings service only describes active entries.
  void ctx.root.loader.await().then(async () => {
    if (!disposed) await migrateLegacySettings(ctx, config, namespace);
  }).catch(error => {
    if (!disposed) console.warn("[tdsh-emoji] Configuration migration failed; old data preserved:", error.message);
  });
}

const plugin = { name, inject, Config, apply };
export default plugin;
