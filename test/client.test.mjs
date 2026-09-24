import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import test from "node:test";

function loadClient() {
  const source = readFileSync(new URL("../lib/client.js", import.meta.url), "utf8");
  let registered;
  const context = {
    window: {
      __ModuleLoader__: {
        load(entry) {
          registered = entry;
        },
      },
    },
    console,
    Symbol,
    Object,
  };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "lib/client.js" });
  const loaded = registered.factory(() => ({
    createElement: (...args) => ({ __kind: "element", args }),
    useState: (value) => [value, () => {}],
    useEffect: () => {},
  }));
  return { registered, loaded };
}

test("client bundle loads through the dsh ModuleLoader format", () => {
  const { registered, loaded } = loadClient();
  assert.ok(registered, "client bundle must self-register via window.__ModuleLoader__.load");
  assert.equal(registered.id, "tdsh-emoji");
  assert.equal(typeof loaded.apply, "function");
  assert.deepEqual(Array.from(loaded.inject), ["slots", "locale"]);
  assert.equal(loaded.ROUTE, "/tdsh-emoji-settings");
  assert.equal(loaded.MAX_PER_TURN, 10);
});

test("client store reads, saves and clamps to 10 emoji", async () => {
  const { loaded } = loadClient();
  let revision = 0;
  const calls = [];
  const fetchImpl = async (url, init) => {
    assert.equal(url, "/tdsh-emoji-settings");
    assert.equal(init.method, "POST");
    const { endpoint, payload } = JSON.parse(init.body);
    calls.push(endpoint);
    if (endpoint === "get") {
      return {
        status: 200,
        json: async () => ({
          ok: true,
          value: {
            settings: { mode: "auto", placement: "inline", maxPerTurn: 3, customPrompt: "" },
            revision,
            writable: true,
          },
        }),
      };
    }
    if (endpoint === "save") {
      revision += 1;
      return {
        status: 200,
        json: async () => ({
          ok: true,
          value: { settings: payload.settings, revision, writable: true },
        }),
      };
    }
    throw new Error("unexpected endpoint");
  };

  const store = loaded.createSettingsStore(fetchImpl);
  await store.refresh();
  assert.equal(store.getSnapshot().status, "ready");
  assert.equal(store.getSnapshot().settings.maxPerTurn, 3);

  await store.patch({ mode: "frequent", maxPerTurn: 10 });
  assert.equal(store.getSnapshot().settings.mode, "frequent");
  assert.equal(store.getSnapshot().settings.maxPerTurn, 10);
  assert.equal(store.getSnapshot().justSaved, true);
  assert.deepEqual(calls, ["get", "save"]);
});

test("client store surfaces an untrusted origin as read-only", async () => {
  const { loaded } = loadClient();
  const store = loaded.createSettingsStore(async () => ({
    status: 403,
    json: async () => ({ ok: false, error: { code: "forbidden", message: "forbidden origin" } }),
  }));
  await store.refresh();
  assert.equal(store.getSnapshot().status, "unavailable");
  assert.equal(store.getSnapshot().writable, false);
  assert.equal(store.getSnapshot().saveError, "forbidden");
  assert.equal(store.getSnapshot().saveErrorMessage, "forbidden origin");
  await store.patch({ mode: "frequent" });
  assert.equal(store.getSnapshot().settings.mode, "auto");
});
