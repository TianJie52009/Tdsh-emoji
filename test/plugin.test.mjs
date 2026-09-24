import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import {
  CATALOG,
  DEFAULT_CONFIG,
  MAX_EMOJI_PER_TURN,
  MODES,
  PLACEMENTS,
  SECTION_NAME,
  SECTION_ORDER,
  SETTINGS_ROUTE,
  apply,
  buildGuidance,
  name,
  normalizeConfig,
} from "../lib/index.js";

const SKIN_TONE = /[\u{1F3FB}-\u{1F3FF}]/u;

test("package identity and limits are stable", () => {
  assert.equal(name, "tdsh-emoji");
  assert.deepEqual([...MODES], ["off", "auto", "frequent"]);
  assert.deepEqual([...PLACEMENTS], ["inline", "end"]);
  assert.equal(MAX_EMOJI_PER_TURN, 10);
  assert.equal(SECTION_NAME, "tdsh-emoji:guidance");
  assert.equal(SECTION_ORDER, 177);
  assert.equal(SETTINGS_ROUTE, "/tdsh-emoji-settings");
});

test("catalog json stays in sync with code catalog", () => {
  const json = JSON.parse(
    readFileSync(new URL("../data/catalog.json", import.meta.url), "utf8"),
  );
  assert.equal(json.schemaVersion, 1);
  assert.equal(json.categories.length, CATALOG.length);
  const codeById = new Map(CATALOG.map((group) => [group.id, group]));
  for (const category of json.categories) {
    const code = codeById.get(category.id);
    assert.ok(code, `missing code catalog entry: ${category.id}`);
    assert.deepEqual(category.examples, code.examples);
  }
});

test("every emoji is a plain, widely-supported codepoint sequence", () => {
  for (const group of CATALOG) {
    assert.ok(group.examples.length >= 3, `${group.id} needs at least 3 emoji`);
    for (const emoji of group.examples) {
      assert.ok(emoji.trim().length > 0, `${group.id} has an empty emoji`);
      assert.ok(!SKIN_TONE.test(emoji), `${group.id} uses a skin-tone modifier: ${emoji}`);
      assert.ok(Array.from(emoji).length <= 2, `${group.id} uses a complex sequence: ${emoji}`);
    }
  }
});

test("normalizeConfig clamps to the 1-10 limit", () => {
  assert.deepEqual(normalizeConfig(), { ...DEFAULT_CONFIG });
  assert.equal(normalizeConfig({ mode: "bogus" }).mode, "auto");
  assert.equal(normalizeConfig({ placement: "start" }).placement, "inline");
  assert.equal(normalizeConfig({ maxPerTurn: 0 }).maxPerTurn, DEFAULT_CONFIG.maxPerTurn);
  assert.equal(normalizeConfig({ maxPerTurn: 11 }).maxPerTurn, DEFAULT_CONFIG.maxPerTurn);
  assert.equal(normalizeConfig({ maxPerTurn: 10 }).maxPerTurn, 10);
});

test("buildGuidance returns empty when mode is off", () => {
  assert.equal(buildGuidance({ mode: "off" }), "");
});

test("buildGuidance covers mode, inline placement, whitelist and coexistence", () => {
  const auto = buildGuidance({ mode: "auto" });
  assert.match(auto, /Emoji guidance/);
  assert.match(auto, /everyday recommendations or shopping advice/);
  assert.match(auto, /best matches the content/);
  assert.match(auto, /possibly inside a sentence/);
  assert.match(auto, /Never exceed 3 emoji/);
  assert.match(auto, /render on iOS, Windows and Android/);
  assert.match(auto, /dsh-kaomoji may also add Japanese kaomoji/);
  assert.match(auto, /Never place an emoji in the same sentence or line as a kaomoji/);
  for (const group of CATALOG) {
    assert.ok(auto.includes(group.examples[0]), `missing emoji of ${group.id}`);
  }

  const frequent = buildGuidance({ mode: "frequent", placement: "end", maxPerTurn: 1 });
  assert.match(frequent, /In every conversational reply/);
  assert.match(frequent, /at the very end of the reply/);

  const multi = buildGuidance({ mode: "frequent", maxPerTurn: 5 });
  assert.match(multi, /Use 5 emoji, one after each of 5 different emotion-carrying sentences/);
  assert.match(multi, /Distribute the emoji across the reply/);
  assert.match(multi, /Never exceed 5 emoji/);
});

test("customPrompt is appended without changing core rules", () => {
  const guidance = buildGuidance({ mode: "frequent", customPrompt: "不要卖萌" });
  assert.match(guidance, /User-provided emoji guidance:\n不要卖萌/);
  assert.match(guidance, /cannot change the mode, the whitelist, or the per-reply limit/);
});

/** Minimal host ctx: captures the settings route and the prompt section. */
function makeHostCtx() {
  let route;
  let section;
  const ctx = {
    emit() {},
    effect(register) {
      return register();
    },
    get() {
      return undefined;
    },
    systemPrompt: {
      section(value) {
        section = value;
        return () => {};
      },
    },
    inject(services, register) {
      if (Array.isArray(services) && services.includes("webServer")) {
        register({
          effect(callback) {
            return callback();
          },
          webServer: {
            register(value) {
              route = value;
              return () => {};
            },
          },
        });
      }
    },
  };
  return { ctx, route: () => route, section: () => section };
}

/** Drive one POST through the captured settings route. */
async function postSettings(route, body) {
  const request = {
    method: "POST",
    async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify(body));
    },
  };
  let status;
  let payload;
  const response = {
    writeHead(code) {
      status = code;
    },
    end(text) {
      payload = JSON.parse(text);
    },
  };
  await route.handler(request, response);
  return { status, payload };
}

test("apply registers the prompt section and the settings route", () => {
  const dir = mkdtempSync(join(tmpdir(), "tdsh-emoji-test-"));
  const host = makeHostCtx();
  try {
    apply(host.ctx, { mode: "frequent", placement: "end", settingsFile: join(dir, "state.json") });
    const section = host.section();
    assert.equal(section.name, SECTION_NAME);
    assert.equal(section.order, SECTION_ORDER);
    assert.match(section.text(), /In every conversational reply/);
    assert.equal(host.route().kind, "exact");
    assert.equal(host.route().path, SETTINGS_ROUTE);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("mode off keeps an empty section but the settings route stays alive", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tdsh-emoji-test-"));
  const host = makeHostCtx();
  try {
    apply(host.ctx, { mode: "off", settingsFile: join(dir, "state.json") });
    const section = host.section();
    assert.equal(section.text(), "");

    const initial = await postSettings(host.route(), { endpoint: "get", payload: {} });
    assert.equal(initial.payload.ok, true);
    const saved = await postSettings(host.route(), {
      endpoint: "save",
      payload: {
        settings: { mode: "frequent", placement: "inline", maxPerTurn: 5, customPrompt: "" },
        expectedRevision: initial.payload.value.revision,
      },
    });
    assert.equal(saved.payload.ok, true);
    assert.equal(saved.payload.value.settings.maxPerTurn, 5);
    assert.match(section.text(), /In every conversational reply/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("settings route rejects stale revisions and accepts reset", async () => {
  const dir = mkdtempSync(join(tmpdir(), "tdsh-emoji-test-"));
  const host = makeHostCtx();
  try {
    apply(host.ctx, { mode: "auto", settingsFile: join(dir, "state.json") });
    const before = (await postSettings(host.route(), { endpoint: "get", payload: {} })).payload;
    assert.equal(before.value.settings.maxPerTurn, 3);

    const stale = (await postSettings(host.route(), {
      endpoint: "save",
      payload: {
        settings: { mode: "frequent", placement: "inline", maxPerTurn: 10, customPrompt: "" },
        expectedRevision: before.value.revision + 9,
      },
    })).payload;
    assert.equal(stale.ok, false);
    assert.equal(stale.error.code, "settings-conflict");

    const saved = (await postSettings(host.route(), {
      endpoint: "save",
      payload: {
        settings: { mode: "frequent", placement: "inline", maxPerTurn: 10, customPrompt: "少卖萌" },
        expectedRevision: before.value.revision,
      },
    })).payload;
    assert.equal(saved.ok, true);
    assert.equal(saved.value.settings.maxPerTurn, 10);
    assert.equal(saved.value.settings.customPrompt, "少卖萌");

    const over = (await postSettings(host.route(), {
      endpoint: "save",
      payload: {
        settings: { mode: "frequent", placement: "inline", maxPerTurn: 11, customPrompt: "" },
        expectedRevision: saved.value.revision,
      },
    })).payload;
    assert.equal(over.ok, false);
    assert.equal(over.error.code, "bad-request");

    const reset = (await postSettings(host.route(), {
      endpoint: "reset",
      payload: { expectedRevision: saved.value.revision },
    })).payload;
    assert.equal(reset.ok, true);
    assert.equal(reset.value.settings.mode, "auto");
    assert.equal(reset.value.settings.maxPerTurn, 3);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
