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

import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const name = "tdsh-emoji";
export const inject = ["systemPrompt"];

/** 贡献给系统提示词的段名/排序（dsh-kaomoji 用 176，这里用 177）。 */
export const SECTION_NAME = "tdsh-emoji:guidance";
export const SECTION_ORDER = 177;

/** 设置命名空间与同源 HTTP 路由（与 dsh-kaomoji 的 /dsh-kaomoji-settings 分开）。 */
export const SETTINGS_NAMESPACE = "tdsh-emoji";
export const SETTINGS_ROUTE = "/tdsh-emoji-settings";
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
      ? "Put it right after the sentence or short phrase whose mood it matches best."
      : "Put each emoji right after a different sentence or short phrase whose mood it matches best.";
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

/** 解析 RPC/持久化文档里的设置对象；非法字段返回 undefined，由调用方拒绝。 */
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

function parseRevision(value) {
  return Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : undefined;
}

function cloneSettings(settings) {
  return { ...settings, customPrompt: settings.customPrompt };
}

function defaultSettingsFile(config) {
  if (typeof config?.settingsFile === "string" && config.settingsFile.trim() !== "") {
    return resolve(config.settingsFile);
  }
  const home =
    typeof process.env.DSH_HOME === "string" && process.env.DSH_HOME.trim() !== ""
      ? process.env.DSH_HOME
      : homedir();
  return join(home, ".dsh", SETTINGS_FILE_NAME);
}

function loadSettingsDocument(file) {
  try {
    const raw = JSON.parse(readFileSync(file, "utf8"));
    if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return undefined;
    if (raw.schemaVersion !== SETTINGS_FILE_SCHEMA_VERSION) return undefined;
    const settings = parseSettings(raw.settings);
    const revision = parseRevision(raw.revision);
    if (settings === undefined || revision === undefined) return undefined;
    return { settings, revision };
  } catch {
    return undefined;
  }
}

function writeSettingsDocument(file, settings, revision) {
  mkdirSync(dirname(file), { recursive: true });
  const payload = `${JSON.stringify(
    {
      schemaVersion: SETTINGS_FILE_SCHEMA_VERSION,
      settings,
      revision,
    },
    null,
    2,
  )}\n`;
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, payload, "utf8");
  try {
    renameSync(tmp, file);
  } catch {
    // Windows 上 rename 覆盖被占用文件可能失败；退回直接写，保证不丢配置。
    rmSync(tmp, { force: true });
    writeFileSync(file, payload, "utf8");
  }
}

function rpcError(code, message) {
  return {
    ok: false,
    error: {
      code,
      message,
      details: { ns: SETTINGS_NAMESPACE },
    },
  };
}

function describeSettings(current, revision, writable) {
  return {
    settings: cloneSettings(current),
    revision,
    writable,
    namespace: SETTINGS_NAMESPACE,
  };
}

/** 设置 RPC：get / save / reset 三个端点，由 apply 挂到 webServer 上。 */
function createSettingsRpcHandler(ctx, settingsFile, getState, commit) {
  let tail = Promise.resolve();
  const exclusive = async (operation) => {
    const previous = tail;
    let release;
    tail = new Promise((done) => {
      release = done;
    });
    await previous;
    try {
      return await operation();
    } finally {
      release();
    }
  };

  return async (endpoint, payload) => {
    try {
      if (endpoint === "get") {
        const state = getState();
        return {
          ok: true,
          value: describeSettings(state.settings, state.revision, state.writable),
        };
      }
      return await exclusive(async () => {
        const state = getState();
        if (endpoint === "save") {
          if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
            return rpcError("bad-request", "Saving emoji settings requires an object payload.");
          }
          const next = parseSettings(payload.settings);
          const expectedRevision = parseRevision(payload.expectedRevision);
          if (next === undefined || expectedRevision === undefined) {
            return rpcError("bad-request", "Emoji settings or revision are invalid.");
          }
          if (expectedRevision !== state.revision) {
            return rpcError(
              "settings-conflict",
              "Emoji settings changed elsewhere. Reload and try again.",
            );
          }
          const revision = state.revision + 1;
          writeSettingsDocument(settingsFile, next, revision);
          commit(next, revision);
          return {
            ok: true,
            value: describeSettings(next, revision, true),
          };
        }
        if (endpoint === "reset") {
          const expectedRevision = parseRevision(payload?.expectedRevision);
          if (expectedRevision === undefined) {
            return rpcError("bad-request", "The revision is invalid.");
          }
          if (expectedRevision !== state.revision) {
            return rpcError(
              "settings-conflict",
              "Emoji settings changed elsewhere. Reload and try again.",
            );
          }
          try {
            rmSync(settingsFile, { force: true });
          } catch {
            // 文件不存在也视为重置成功。
          }
          const base = getState().base;
          const revision = state.revision + 1;
          commit(base, revision);
          return {
            ok: true,
            value: describeSettings(base, revision, true),
          };
        }
        return rpcError("bad-request", `Unknown tdsh-emoji settings operation: ${endpoint}`);
      });
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      console.warn(`[tdsh-emoji] settings rpc failed: ${reason}`);
      return rpcError("settings-rejected", `The Host rejected the emoji settings: ${reason}`);
    }
  };
}

export function apply(ctx, config = {}) {
  const baseSettings = normalizeConfig(config);
  const settingsFile = defaultSettingsFile(config);
  const stored = loadSettingsDocument(settingsFile);

  let currentSettings = stored?.settings ?? cloneSettings(baseSettings);
  let revision = stored?.revision ?? 0;

  const getState = () => ({
    settings: cloneSettings(currentSettings),
    revision,
    writable: true,
    base: cloneSettings(baseSettings),
  });

  const adoptSettings = (next, nextRevision = revision) => {
    const changed =
      next.mode !== currentSettings.mode ||
      next.placement !== currentSettings.placement ||
      next.maxPerTurn !== currentSettings.maxPerTurn ||
      next.customPrompt !== currentSettings.customPrompt;
    currentSettings = normalizeConfig(next);
    revision = nextRevision;
    if (changed) ctx.emit("system-prompt/change");
  };

  // mode=off 时 section 仍注册，但 text 返回空串，保证卡片能随时打开。
  ctx.effect(
    () =>
      ctx.systemPrompt.section({
        name: SECTION_NAME,
        order: SECTION_ORDER,
        text: () => buildGuidance(currentSettings),
      }),
    "tdsh-emoji: guidance",
  );

  // 设置读写走 webServer 同源路由（POST /tdsh-emoji-settings）。
  const settingsHandler = createSettingsRpcHandler(ctx, settingsFile, getState, adoptSettings);
  const attachSettingsRoute = (scope) => {
    scope.effect(
      () =>
        scope.webServer.register({
          kind: "exact",
          path: SETTINGS_ROUTE,
          handler: async (request, response) => {
            const reply = (status, value) => {
              response.writeHead(status, {
                "Content-Type": "application/json; charset=utf-8",
                "Cache-Control": "no-store",
              });
              response.end(JSON.stringify(value));
            };
            if (request.method !== "POST") {
              reply(405, rpcError("bad-request", "POST required"));
              return;
            }
            let raw = "";
            try {
              for await (const chunk of request) raw += chunk;
            } catch {
              // 客户端中断：按空 body 处理，下面的解析会返回 400。
            }
            let endpoint = "";
            let payload;
            try {
              const parsed = JSON.parse(raw === "" ? "{}" : raw);
              endpoint = typeof parsed.endpoint === "string" ? parsed.endpoint : "";
              payload = parsed.payload;
            } catch {
              reply(400, rpcError("bad-request", "invalid JSON body"));
              return;
            }
            reply(200, await settingsHandler(endpoint, payload));
          },
        }),
      "tdsh-emoji: settings route",
    );
    console.log(`[tdsh-emoji] settings route 已注册（path=${SETTINGS_ROUTE}）`);
  };
  const webServer = typeof ctx.get === "function" ? ctx.get("webServer") : undefined;
  if (webServer !== undefined) {
    attachSettingsRoute(ctx);
  } else {
    ctx.inject(["webServer"], attachSettingsRoute);
  }

  console.log(
    `[tdsh-emoji] 已挂载（mode=${currentSettings.mode}, placement=${currentSettings.placement}, maxPerTurn=${String(currentSettings.maxPerTurn)}, settingsFile=${settingsFile}）`,
  );
}

const plugin = { name, inject, apply };
export default plugin;
