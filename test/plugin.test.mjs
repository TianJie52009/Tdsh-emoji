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
test("native config schema rejects invalid settings", async () => {
  const { Config } = await import("../lib/index.js");
  const value = Config({});
  assert.equal(value.mode.get(), DEFAULT_CONFIG.mode);
  for (const input of [{ mode: "bad" }, { placement: "bad" }, { maxPerTurn: 0 }, { maxPerTurn: 1.5 }, { maxPerTurn: 11 }, { customPrompt: "x".repeat(4001) }]) {
    assert.throws(() => Config(input));
  }
});

test("manifest covers only the nine agreed Harness releases and uses native remotes", () => {
  const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));
  const releases = ["0.2.0-rc.2", ...[1,2,3,4,5].map(n => "0.2.1-alpha." + n), ...[1,2,3].map(n => "0.2.1-rc." + n)];
  assert.deepEqual(pkg.engines.dsh.split(" || "), releases);
  for (const [peer, range] of Object.entries(pkg.peerDependencies)) {
    if (peer.startsWith("@deepseek-ai/dsh-")) assert.equal(range, pkg.engines.dsh);
  }
  assert.equal(pkg.peerDependencies["@deepseek-ai/dsh-host-webserver"], undefined);
  assert.ok(pkg.dsh.client.inject.includes("@deepseek-ai/dsh-api-remotes"));
  for (const peer of pkg.dsh.client.inject) assert.ok(pkg.peerDependencies[peer]);
  assert.equal(pkg.dsh.manifestVersion, 1);
});
