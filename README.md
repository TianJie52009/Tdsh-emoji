# Tdsh-emoji

> 给 [DeepSeek Harness](https://github.com/deepseek-ai)（dsh）的回复自动添加标准 emoji，并且能和 dsh-kaomoji 共存。

[![npm](https://img.shields.io/npm/v/tdsh-emoji.svg)](https://www.npmjs.com/package/tdsh-emoji)
[![license](https://img.shields.io/github/license/TianJie52009/Tdsh-emoji.svg)](./LICENSE)

> 🤖 **纯 Codex 生成**：本仓库的代码与文档均由 OpenAI Codex 自动生成，未经人工逐行审查。使用前请自行阅读并测试。

`Tdsh-emoji` 在模型生成前向系统提示词注入一段「情绪 → emoji」白名单规则，让模型在**贴合情绪的句子或短句之后**放一个标准 Unicode 表情。词库只收 iOS / Windows / Android 普遍内置的表情，不用肤色修饰、组合序列和新版本 emoji，老设备也能正常显示。

## 特性

- **贴合句子**：emoji 放在最贴合情绪的句子/短句之后（`inline`，默认），或统一放回复结尾（`end`）。
- **单条上限 10 个**：`maxPerTurn` 范围 1–10，默认 3；`frequent` 模式下会按数量分散到不同句子。
- **与 dsh-kaomoji 共存**：两个插件都是“贴合句子”的插法，所以本插件额外规定 **emoji 与颜文字不得出现在同一句/同一行**，模型会把它们分到不同句子；两张设置卡片同在「设置 → 通用设置」且相邻排列。
- **可视化配置卡片**：模式（关闭 / 智能 / 高频）、放置位置、每条上限、附加提示词，保存即生效，无需重启。
- **远程可改**：设置走同源路由，Tailscale、局域网、SSH 端口转发打开页面都能保存。
- **零第三方运行时依赖**：只用 dsh 自带的 `systemPrompt` 与 Node 标准库。

## 工作原理

1. 启动时注册系统提示词段 `tdsh-emoji:guidance`（order `177`，dsh-kaomoji 是 `176`）。
2. 每次组装提示词时注入：模式与位置规则、每条上限、emoji 白名单、以及“不得与颜文字同句”的共存规则。
3. 设置卡片通过同源路由 `POST /tdsh-emoji-settings` 读写 `~/.dsh/tdsh-emoji.json`；Host 写入后立即更新提示词段，下一次回复生效。

## 安装

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"

# npm（推荐）
dsh plugin --profile web add tdsh-emoji

# 或 GitHub 直装
dsh plugin --profile web add github:TianJie52009/Tdsh-emoji
```

装完重启 Web Host，在「设置 → 通用设置」中会看到「Emoji（tdsh-emoji）」卡片，就排在「颜文字（dsh-kaomoji）」旁边。

## 配置

默认 `mode: auto`、`placement: inline`、`maxPerTurn: 3`。也可以在 profile 的 `cordis.patch.yml` 里覆盖部署默认值：

```yaml
- id: tdsh-emoji
  config:
    mode: frequent     # off | auto | frequent
    placement: inline  # inline | end
    maxPerTurn: 5      # 1-10
    customPrompt: "正式场景克制一点，优先用「鼓励 / 感谢」类 emoji"
```

| 配置项 | 类型 | 默认值 | 说明 |
| --- | --- | --- | --- |
| `mode` | `'off' \| 'auto' \| 'frequent'` | `'auto'` | `off` 关闭；`auto` 对话式回复基本都会带；`frequent` 每条对话回复都带（纯代码/正式交付除外） |
| `placement` | `'inline' \| 'end'` | `'inline'` | 贴合情绪的句子之后，或回复结尾 |
| `maxPerTurn` | `number`（1–10） | `3` | 单条回复 emoji 上限；`frequent` 会按数量分散到不同句子 |
| `customPrompt` | `string` | `''` | 附加风格/场景说明，不能改变模式、白名单或上限 |
| `settingsFile` | `string` | `~/.dsh/tdsh-emoji.json` | （进阶）用户设置持久化路径 |

## 与 dsh-kaomoji 共存

| 插件 | 插入内容 | 位置 | 冲突处理 |
| --- | --- | --- | --- |
| dsh-kaomoji | 日式颜文字 `(´∀｀)` | 贴合情绪的句子之后 | 互不干扰：emoji 一侧明确禁止与颜文字同句/同行 |
| Tdsh-emoji | 标准 emoji 😊 | 贴合情绪的句子之后 | `Never place an emoji in the same sentence or line as a kaomoji` |

两张设置卡片都在「设置 → 通用设置」（order 30 / 31），可以挨着调。

## 开发

```powershell
npm test   # node:test 单测（提示词规则 + 设置路由 + client 加载）
npm pack   # 验证发布内容
```

```text
Tdsh-emoji/
├── lib/
│   ├── index.js       # Host：config、规则生成、提示词段、设置路由
│   ├── client.js      # Web：设置 → 通用设置 卡片
│   └── index.d.ts
├── data/catalog.json  # 情绪 -> emoji 白名单
├── test/
├── cordis.patch.yml
├── package.json
├── README.md / README.en.md
└── CHANGELOG.md
```

## License

[MIT](./LICENSE)
