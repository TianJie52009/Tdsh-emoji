/** Native General settings card; all persistence uses Harness remote.settings. */
window.__ModuleLoader__.load({
  id: "tdsh-emoji",
  factory: (require) => {
    const module = { exports: {} };
    const exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

    const react = require("react");
    const { useState, useEffect } = react;
    const h = react.createElement;

    const NS = "tdsh-emoji";
    const MODES = ["off", "auto", "frequent"];
    const PLACEMENTS = ["inline", "end"];
    const MAX_PER_TURN = 10;
    const DEFAULT_SETTINGS = Object.freeze({
      mode: "auto",
      placement: "inline",
      maxPerTurn: 3,
      customPrompt: "",
    });

    function normalizeSettings(value) {
      const mode = MODES.includes(value.mode) ? value.mode : DEFAULT_SETTINGS.mode;
      const placement = PLACEMENTS.includes(value.placement)
        ? value.placement
        : DEFAULT_SETTINGS.placement;
      const maxPerTurn =
        Number.isInteger(value.maxPerTurn) &&
        value.maxPerTurn >= 1 &&
        value.maxPerTurn <= MAX_PER_TURN
          ? value.maxPerTurn
          : DEFAULT_SETTINGS.maxPerTurn;
      const customPrompt =
        typeof value.customPrompt === "string" && value.customPrompt.length <= 4000
          ? value.customPrompt
          : "";
      return { mode, placement, maxPerTurn, customPrompt };
    }

    function cloneSettings(settings) {
      return { ...settings, customPrompt: settings.customPrompt };
    }

    const zh = {
      "row.title": "Emoji（tdsh-emoji）",
      "row.description": "给对话回复自动加标准 emoji，贴在最匹配的内容旁边；与颜文字插件互不同句。",
      "field.mode": "使用频率",
      "mode.off": "关闭",
      "mode.off.desc": "不使用 emoji",
      "mode.auto": "智能",
      "mode.auto.desc": "寒暄、闲聊、推荐建议、共情回复都会带",
      "mode.frequent": "高频",
      "mode.frequent.desc": "每条对话回复都带（纯代码/正式交付除外）",
      "field.placement": "放置位置",
      "placement.inline": "贴合内容",
      "placement.end": "回复结尾",
      "field.max": "每条上限",
      "field.prompt": "附加提示词",
      "prompt.placeholder": "例如：正式场景克制一点，优先用「鼓励/感谢」类 emoji",
      "prompt.help": "只细化风格与场景，不能改变模式、白名单或数量上限。",
      "action.retry": "重试",
      "action.reset": "恢复默认",
      "status.loading": "正在读取设置…",
      "status.saved": "已保存，下一次回复生效。",
      "status.unsupported": "Host 未加载 emoji 插件或该来源不被信任，无法保存设置。",
      "status.forbidden": "当前来源不在 Host 的信任列表里，无法保存设置。",
      "status.error": "保存失败，请重试。",
    };

    const en = {
      "row.title": "Emoji (tdsh-emoji)",
      "row.description": "Adds standard emoji to replies, placed right where the content they match appears; never shares a line with kaomoji.",
      "field.mode": "Frequency",
      "mode.off": "Off",
      "mode.off.desc": "No emoji",
      "mode.auto": "Smart",
      "mode.auto.desc": "Greetings, casual chat, recommendations and empathetic replies get emoji",
      "mode.frequent": "Frequent",
      "mode.frequent.desc": "Emoji in every conversational reply (code-only/formal excluded)",
      "field.placement": "Placement",
      "placement.inline": "Match the content",
      "placement.end": "End of reply",
      "field.max": "Max per reply",
      "field.prompt": "Extra guidance",
      "prompt.placeholder": "e.g. Stay professional; prefer encourage/thanks emoji",
      "prompt.help": "Refines tone/scenes only; cannot change mode, whitelist, or limits.",
      "action.retry": "Retry",
      "action.reset": "Reset to defaults",
      "status.loading": "Loading settings…",
      "status.saved": "Saved — applies to the next reply.",
      "status.unsupported": "The Host did not load the emoji plugin, or this origin is not trusted.",
      "status.forbidden": "This origin is not in the Host trust list, so settings cannot be saved.",
      "status.error": "Save failed, please retry.",
    };

    const styles = {
      card: {
        display: "flex",
        flexDirection: "column",
        gap: 12,
        padding: "14px 16px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 12,
        background: "var(--dsw-alias-bg-layer-3)",
        color: "var(--dsw-alias-label-primary)",
      },
      header: { display: "flex", flexDirection: "column", gap: 4, minWidth: 0 },
      title: { fontSize: 15, lineHeight: "21px", fontWeight: 600 },
      description: {
        fontSize: 13,
        lineHeight: "19px",
        color: "var(--dsw-alias-label-tertiary)",
      },
      grid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
        gap: 12,
      },
      field: { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 },
      label: { fontSize: 13, lineHeight: "18px", fontWeight: 600 },
      modeRow: {
        display: "grid",
        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
        gap: 8,
      },
      mode: {
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        gap: 4,
        padding: "8px 6px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 8,
        background: "var(--dsw-alias-bg-module-platform)",
        color: "inherit",
        font: "inherit",
        cursor: "pointer",
      },
      modeName: { fontSize: 12, lineHeight: "18px", fontWeight: 600 },
      modeDesc: {
        fontSize: 11,
        lineHeight: "16px",
        color: "var(--dsw-alias-label-tertiary)",
      },
      select: {
        boxSizing: "border-box",
        width: "100%",
        padding: "7px 10px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 8,
        background: "var(--dsw-alias-bg-module-platform)",
        color: "var(--dsw-alias-label-primary)",
        font: "inherit",
        fontSize: 13,
      },
      number: {
        boxSizing: "border-box",
        width: "100%",
        padding: "7px 10px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 8,
        background: "var(--dsw-alias-bg-module-platform)",
        color: "var(--dsw-alias-label-primary)",
        font: "inherit",
        fontSize: 13,
      },
      prompt: {
        boxSizing: "border-box",
        width: "100%",
        minHeight: 72,
        resize: "vertical",
        padding: "8px 10px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 8,
        background: "var(--dsw-alias-bg-module-platform)",
        color: "var(--dsw-alias-label-primary)",
        font: "inherit",
        fontSize: 13,
        lineHeight: 1.55,
      },
      footer: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
      },
      status: { fontSize: 12, lineHeight: "18px", color: "var(--dsw-alias-label-tertiary)" },
      reset: {
        flex: "0 0 auto",
        padding: "6px 10px",
        border: "1px solid var(--dsw-alias-border-l2)",
        borderRadius: 8,
        background: "none",
        color: "var(--dsw-alias-label-secondary)",
        font: "inherit",
        fontSize: 12,
        cursor: "pointer",
      },
    };

    /** 轻量快照 store；slot runtime 会包装成 useEmojiSettings(selector)。 */
    function createSettingsStore(remote) {
      let snapshot = {
        status: "loading", settings: cloneSettings(DEFAULT_SETTINGS),
        revision: undefined, writable: false, saveError: null, justSaved: false,
      };
      const listeners = new Set();
      let tail = Promise.resolve();
      let closed = false;
      const publish = patch => {
        if (closed) return;
        snapshot = { ...snapshot, ...patch };
        for (const listener of listeners) listener();
      };
      const enqueue = operation => {
        const task = tail.then(async () => {
          if (closed) return;
          try { await operation(); }
          catch (error) {
            publish({ status: "unavailable", writable: false, justSaved: false,
              saveError: "save", saveErrorMessage: error.message || String(error) });
          }
        });
        tail = task;
        return task;
      };
      const unwrap = result => {
        if (!result?.ok) throw new Error(result?.error?.message || "Harness rejected settings");
        return result.value;
      };
      const accept = (row, writable = snapshot.writable, justSaved = false) => publish({
        status: "ready", settings: normalizeSettings(row.value), revision: row.revision,
        writable, justSaved, saveError: null, saveErrorMessage: null,
      });
      const describe = async () => {
        const document = unwrap(await remote.describe());
        const row = document.namespaces.find(item => item.ns === NS);
        if (!row) throw new Error("Harness settings namespace is unavailable: " + NS);
        return { row, writable: document.writable === true };
      };
      return {
        getSnapshot: () => snapshot,
        subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
        dispose() { closed = true; listeners.clear(); },
        refresh: () => enqueue(async () => {
          const { row, writable } = await describe();
          accept(row, writable);
        }),
        patch: field => enqueue(async () => {
          if (!snapshot.writable) return;
          // Send only edited fields so rapid changes and other settings remain intact.
          const values = normalizeSettings({ ...snapshot.settings, ...field });
          const patch = Object.fromEntries(Object.keys(field).map(key => [key, values[key]]));
          const row = unwrap(await remote.update(NS, { ...patch, migrationVersion: 1 }, snapshot.revision));
          accept(row, true, true);
        }),
        reset: () => enqueue(async () => {
          if (!snapshot.writable) return;
          const row = unwrap(await remote.replace(NS, { migrationVersion: 1 }, snapshot.revision));
          accept(row, true, true);
        }),
      };
    }

    function EmojiSettingsRow(props) {
      const { t, useEmojiSettings } = props;
      const state = useEmojiSettings((value) => value);
      const settings = state.settings;
      const [promptDraft, setPromptDraft] = useState(settings.customPrompt);

      useEffect(() => {
        setPromptDraft(settings.customPrompt);
      }, [settings.customPrompt]);

      const statusText = state.saveError
        ? state.saveError === "forbidden"
          ? t("status.forbidden")
          : state.saveErrorMessage
            ? `${t("status.error")} ${state.saveErrorMessage}`
            : t("status.error")
        : state.status === "loading"
          ? t("status.loading")
          : !state.writable
            ? t("status.unsupported")
            : state.justSaved
              ? t("status.saved")
              : t("prompt.help");
      const controlsDisabled = !state.writable || state.status === "loading";

      return h(
        "section",
        { style: styles.card, "data-tdsh-emoji-settings": "true" },
        h(
          "div",
          { style: styles.header },
          h("div", { style: styles.title }, t("row.title")),
          h("div", { style: styles.description }, t("row.description")),
        ),
        h(
          "div",
          { style: styles.grid },
          h(
            "div",
            { style: styles.field },
            h("div", { style: styles.label }, t("field.mode")),
            h(
              "div",
              { style: styles.modeRow },
              ["off", "auto", "frequent"].map((mode) =>
                h(
                  "button",
                  {
                    key: mode,
                    type: "button",
                    style: {
                      ...styles.mode,
                      borderColor:
                        settings.mode === mode
                          ? "var(--dsw-alias-label-primary)"
                          : "var(--dsw-alias-border-l2)",
                    },
                    "aria-pressed": settings.mode === mode,
                    disabled: controlsDisabled,
                    onClick: () => props.setMode(mode),
                  },
                  h("span", { style: styles.modeName }, t(`mode.${mode}`)),
                  h("span", { style: styles.modeDesc }, t(`mode.${mode}.desc`)),
                ),
              ),
            ),
          ),
          h(
            "div",
            { style: styles.field },
            h("label", { style: styles.label }, t("field.placement")),
            h(
              "select",
              {
                style: styles.select,
                value: settings.placement,
                disabled: controlsDisabled,
                onChange: (event) => props.setPlacement(event.target.value),
              },
              h("option", { value: "inline" }, t("placement.inline")),
              h("option", { value: "end" }, t("placement.end")),
            ),
          ),
          h(
            "div",
            { style: styles.field },
            h("label", { htmlFor: "tdsh-emoji-max", style: styles.label }, t("field.max")),
            h("input", {
              id: "tdsh-emoji-max",
              type: "number",
              min: 1,
              max: MAX_PER_TURN,
              step: 1,
              style: styles.number,
              value: String(settings.maxPerTurn),
              disabled: controlsDisabled,
              onChange: (event) => {
                const parsed = Number(event.target.value);
                if (!Number.isNaN(parsed) && parsed >= 1 && parsed <= MAX_PER_TURN) {
                  props.setMaxPerTurn(parsed);
                }
              },
            }),
          ),
        ),
        h(
          "div",
          { style: styles.field },
          h("label", { htmlFor: "tdsh-emoji-prompt", style: styles.label }, t("field.prompt")),
          h("textarea", {
            id: "tdsh-emoji-prompt",
            style: styles.prompt,
            placeholder: t("prompt.placeholder"),
            value: promptDraft,
            disabled: controlsDisabled,
            onChange: (event) => setPromptDraft(event.target.value),
            onBlur: () => {
              if (promptDraft !== settings.customPrompt) {
                props.setCustomPrompt(promptDraft);
              }
            },
          }),
        ),
        h(
          "div",
          { style: styles.footer },
          h("div", { style: styles.status }, statusText),
          h(
            "button",
            {
              type: "button",
              style: styles.reset,
              disabled: controlsDisabled,
              onClick: () => void props.reset(),
            },
            t("action.reset"),
          ),
          state.saveError ? h("button", { type: "button", style: styles.reset, onClick: () => void props.retry() }, t("action.retry")) : null,
        ),
      );
    }

    const inject = ["slots", "locale", "remote", "remote.settings"];

    function apply(ctx) {
      ctx.effect(
        () => ctx.locale.register(NS, { zh, en }),
        "tdsh-emoji: dictionaries",
      );
      const controller = createSettingsStore(ctx.remote.settings);
      void controller.refresh();

      ctx.effect(() => {
        const disposeReset = ctx.on("connection/reset", () => void controller.refresh());
        const disposeUpdate = ctx.remote.$on("settings/document-updated", ns => { if(ns === NS) void controller.refresh(); });
        return () => { disposeReset(); disposeUpdate(); controller.dispose(); };
      }, "tdsh-emoji: settings invalidations");

      ctx.slots.inject("settings.general.item", () =>
        ctx.slots.register(
          {
            name: "settings.general.item",
            // 排在 dsh-kaomoji（order 30）后面，两张卡片相邻。
            id: "tdsh-emoji",
            order: 31,
            locale: NS,
            inject: () => ({
              hooks: { emojiSettings: controller },
              setMode: (mode) => void controller.patch({ mode }),
              setPlacement: (placement) => void controller.patch({ placement }),
              setMaxPerTurn: (maxPerTurn) => void controller.patch({ maxPerTurn }),
              setCustomPrompt: (customPrompt) => void controller.patch({ customPrompt }),
              reset: () => controller.reset(),
              retry: () => controller.refresh(),
            }),
          },
          EmojiSettingsRow,
        ),
      );
    }

    exports.apply = apply;
    exports.inject = inject;
    exports.NS = NS;
    exports.MAX_PER_TURN = MAX_PER_TURN;
    exports.createSettingsStore = createSettingsStore;
    exports.EmojiSettingsRow = EmojiSettingsRow;
    return module.exports;
  },
});
