# Tdsh-emoji

> Add standard Unicode emoji to [DeepSeek Harness](https://github.com/deepseek-ai) (dsh) replies, designed to coexist with dsh-kaomoji.

[![npm](https://img.shields.io/npm/v/tdsh-emoji.svg)](https://www.npmjs.com/package/tdsh-emoji)
[![license](https://img.shields.io/github/license/TianJie52009/Tdsh-emoji.svg)](./LICENSE)

> 🤖 **Pure Codex generation** — the code and docs in this repository were
> generated entirely by OpenAI Codex and have not been human-reviewed.

`Tdsh-emoji` injects a “mood → emoji” whitelist into the system prompt, so the
model places a standard emoji **right where the content it matches appears** —
possibly inside a sentence — instead of always appending it after the sentence.
The library only uses emoji that ship with iOS, Windows and Android; no
skin-tone modifiers, no exotic sequences.

## Features

- **Content-matching placement** — at the point that best matches the content (inside a sentence is fine, default), or at the end of the reply (`end`).
- **Up to 10 per reply** — `maxPerTurn` 1–10, default 3; `frequent` spreads them across sentences.
- **Coexists with dsh-kaomoji** — both place decorations after sentences, so this plugin also forbids emoji and kaomoji in the **same sentence or line**; the model picks different sentences. Both settings cards live next to each other under Settings → General.
- **Visual settings card** — mode, placement, limit and extra guidance; saved live, no restart.
- **Official transport** — Web and Desktop use Harness `remote.settings`; remote pages follow the Host's authentication and trust settings.
- **Native settings** — official Harness Config schemas, `systemPrompt`, `settings` and Node built-ins; no plugin-owned `webServer` routes.

## How it works

1. Registers the prompt section `tdsh-emoji:guidance` (order `177`; dsh-kaomoji uses `176`).
2. Each assembly contributes mode/placement rules, the per-reply cap, the emoji whitelist, and the “never share a sentence with a kaomoji” rule.
3. The settings card uses official Harness `remote.settings` to edit the active profile's native configuration. Live Config updates apply to the next reply. Legacy JSON is imported once and preserved.

## Install

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"

# npm (recommended)
dsh plugin --profile web add tdsh-emoji

# or straight from GitHub
dsh plugin --profile web add github:TianJie52009/Tdsh-emoji
```

Restart the Host and reload the Web or Desktop client; the “Emoji (tdsh-emoji)” card appears under Settings → General, right next to the dsh-kaomoji card.

## Configuration

Defaults: `mode: auto`, `placement: inline`, `maxPerTurn: 3`. Deployment defaults can be overridden in the profile’s `cordis.patch.yml`:

```yaml
- id: tdsh-emoji
  config:
    mode: frequent     # off | auto | frequent
    placement: inline  # inline | end
    maxPerTurn: 5      # 1-10
    customPrompt: "Keep it professional; prefer encourage/thanks emoji"
```

| Key | Type | Default | Description |
| --- | --- | --- | --- |
| `mode` | `'off' \| 'auto' \| 'frequent'` | `'auto'` | `off` disables; `auto` decorates conversational replies; `frequent` decorates every conversational reply (code-only/formal excluded) |
| `placement` | `'inline' \| 'end'` | `'inline'` | At the point that best matches the content (inside a sentence is fine), or at the reply end |
| `maxPerTurn` | `number` (1–10) | `3` | Emoji cap per reply; `frequent` spreads them across sentences |
| `customPrompt` | `string` | `''` | Extra style/scene guidance |
| `settingsFile` | `string` | `''` (auto-discover legacy file) | (advanced) legacy JSON import path; future writes use Harness native configuration |

## Legacy configuration migration

On first load, import schemaVersion 1 tdsh-emoji.json from the Host data directory, a legacy nested DSH_HOME/.dsh path, or settingsFile. Existing native user fields win. Preserve the source JSON and commit migrationVersion with the import. Reset retains this marker, preventing reimport. Failed imports log a warning and retry after restart. Settings are per profile after migration.

## Coexistence with dsh-kaomoji

| Plugin | Inserts | Position | Conflict handling |
| --- | --- | --- | --- |
| dsh-kaomoji | Japanese kaomoji `(´∀｀)` | after the matching sentence | emoji side forbids sharing a sentence/line |
| Tdsh-emoji | Standard emoji 😊 | at the point matching the content | `Never place an emoji in the same sentence or line as a kaomoji` |

Both cards live under Settings → General (order 30 / 31).

## Compatibility

Supports exactly the nine published Harness releases from **0.2.0-rc.2 through 0.2.1-rc.3**, including alpha.1–alpha.5 and rc.1–rc.3. Later releases require separate validation.

Host services: `systemPrompt`, `settings`, `profileContext`. The client uses `slots`, `locale`, `remote.settings` and reconnect notifications. No plugin-owned HTTP routes or webServer dependency. See [validation evidence](./COMPATIBILITY.md).

## Development

```powershell
npm ci --legacy-peer-deps
npm test          # node:test (guidance rules + native settings/migration + client loading)
npm run test:compat  # isolated official-runtime compatibility matrix
npm pack          # verify the publish payload
.\publish.cmd     # one-click publish to npm (current version)
.\publish.cmd minor   # bump the version, then publish
```

## Market synchronization

The repository is already listed; the upstream catalog periodically probes npm versions. Maintainer handoff and market synchronization scripts live in the local parent directory shared by the two projects, outside this package. The per-project entry points are HANDOFF-Tdsh-emoji.md and sync-market-Tdsh-emoji.cmd.

## License

[MIT](./LICENSE)
