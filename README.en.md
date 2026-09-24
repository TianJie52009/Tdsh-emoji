# Tdsh-emoji

> Add standard Unicode emoji to [DeepSeek Harness](https://github.com/deepseek-ai) (dsh) replies, designed to coexist with dsh-kaomoji.

[![npm](https://img.shields.io/npm/v/tdsh-emoji.svg)](https://www.npmjs.com/package/tdsh-emoji)
[![license](https://img.shields.io/github/license/TianJie52009/Tdsh-emoji.svg)](./LICENSE)

> 🤖 **Pure Codex generation** — the code and docs in this repository were
> generated entirely by OpenAI Codex and have not been human-reviewed.

`Tdsh-emoji` injects a “mood → emoji” whitelist into the system prompt, so the
model puts a standard emoji **right after the sentence or short phrase whose
mood it matches**. The library only uses emoji that ship with iOS, Windows and
Android; no skin-tone modifiers, no exotic sequences.

## Features

- **Inline placement** — after the matching sentence (default), or at the end of the reply (`end`).
- **Up to 10 per reply** — `maxPerTurn` 1–10, default 3; `frequent` spreads them across sentences.
- **Coexists with dsh-kaomoji** — both place decorations after sentences, so this plugin also forbids emoji and kaomoji in the **same sentence or line**; the model picks different sentences. Both settings cards live next to each other under Settings → General.
- **Visual settings card** — mode, placement, limit and extra guidance; saved live, no restart.
- **Remote-friendly** — the settings route is same-origin, so Tailscale/LAN/SSH-tunnel pages can save.
- **No third-party runtime dependencies** — dsh's `systemPrompt` service and Node built-ins only.

## How it works

1. Registers the prompt section `tdsh-emoji:guidance` (order `177`; dsh-kaomoji uses `176`).
2. Each assembly contributes mode/placement rules, the per-reply cap, the emoji whitelist, and the “never share a sentence with a kaomoji” rule.
3. The settings card uses `POST /tdsh-emoji-settings` to read/write `~/.dsh/tdsh-emoji.json`; the Host updates the prompt section immediately.

## Install

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"

# npm (recommended)
dsh plugin --profile web add tdsh-emoji

# or straight from GitHub
dsh plugin --profile web add github:TianJie52009/Tdsh-emoji
```

Restart the Web Host; the “Emoji (tdsh-emoji)” card appears under Settings → General, right next to the dsh-kaomoji card.

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
| `placement` | `'inline' \| 'end'` | `'inline'` | After the matching sentence, or at the reply end |
| `maxPerTurn` | `number` (1–10) | `3` | Emoji cap per reply; `frequent` spreads them across sentences |
| `customPrompt` | `string` | `''` | Extra style/scene guidance |
| `settingsFile` | `string` | `~/.dsh/tdsh-emoji.json` | (advanced) user-settings path |

## Coexistence with dsh-kaomoji

| Plugin | Inserts | Position | Conflict handling |
| --- | --- | --- | --- |
| dsh-kaomoji | Japanese kaomoji `(´∀｀)` | after the matching sentence | emoji side forbids sharing a sentence/line |
| Tdsh-emoji | Standard emoji 😊 | after the matching sentence | `Never place an emoji in the same sentence or line as a kaomoji` |

Both cards live under Settings → General (order 30 / 31).

## Development

```powershell
npm test   # node:test (guidance rules + settings route + client loading)
npm pack   # verify the publish payload
```

## License

[MIT](./LICENSE)
