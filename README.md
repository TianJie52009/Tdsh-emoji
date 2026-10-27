# Tdsh-emoji

> 给 [DeepSeek Harness](https://github.com/deepseek-ai)（dsh）的回复自动添加标准 emoji，并且能和 dsh-kaomoji 共存。

[![npm](https://img.shields.io/npm/v/tdsh-emoji.svg)](https://www.npmjs.com/package/tdsh-emoji)
[![license](https://img.shields.io/github/license/TianJie52009/Tdsh-emoji.svg)](./LICENSE)

> 🤖 **纯 Codex 生成**：本仓库的代码与文档均由 OpenAI Codex 自动生成，未经人工逐行审查。使用前请自行阅读并测试。

`Tdsh-emoji` 在模型生成前向系统提示词注入一段「情绪 → emoji」白名单规则，让模型把标准 Unicode 表情放在**最匹配的内容旁边**（可以落在句子中间），而不是固定追加到句尾。词库只收 iOS / Windows / Android 普遍内置的表情，不用肤色修饰、组合序列和新版本 emoji，老设备也能正常显示。

## 特性

- **贴合内容**：emoji 放在最匹配的词、短语或句子旁边（可在句中，`inline` 默认），或统一放回复结尾（`end`）。
- **单条上限 10 个**：`maxPerTurn` 范围 1–10，默认 3；`frequent` 模式下会按数量分散到不同句子。
- **与 dsh-kaomoji 共存**：两个插件都是“贴合句子”的插法，所以本插件额外规定 **emoji 与颜文字不得出现在同一句/同一行**，模型会把它们分到不同句子；两张设置卡片同在「设置 → 通用设置」且相邻排列。
- **可视化配置卡片**：模式（关闭 / 智能 / 高频）、放置位置、每条上限、附加提示词，保存即生效，无需重启。
- **共用官方通信**：Web 与桌面端通过 Harness 的 `remote.settings` 编辑配置；远程访问沿用 Host 的认证和信任设置。
- **原生设置接口**：使用 Harness 的 `systemPrompt`、`settings`、官方 Config schema 与 Node 标准库，不依赖插件自己的 `webServer` 路由。

## 工作原理

1. 启动时注册系统提示词段 `tdsh-emoji:guidance`（order `177`，dsh-kaomoji 是 `176`）。
2. 每次组装提示词时注入：模式与位置规则、每条上限、emoji 白名单、以及“不得与颜文字同句”的共存规则。
3. 设置卡片通过 Harness 官方 `remote.settings` 读写当前 profile 的原生配置；Host 的动态 Config 更新后，下一次回复生效，旧 JSON 首次升级时自动导入并保留。

## 安装

```powershell
cd "$env:USERPROFILE\.dsh\profiles\web"

# npm（推荐）
dsh plugin --profile web add tdsh-emoji

# 或 GitHub 直装
dsh plugin --profile web add github:TianJie52009/Tdsh-emoji
```

装完重启 Host 并刷新客户端，在 Web 或桌面端的「设置 → 通用设置」中会看到「Emoji（tdsh-emoji）」卡片，就排在「颜文字（dsh-kaomoji）」旁边。

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
| `placement` | `'inline' \| 'end'` | `'inline'` | 贴合内容（放在最匹配的位置，可在句中），或回复结尾 |
| `maxPerTurn` | `number`（1–10） | `3` | 单条回复 emoji 上限；`frequent` 会按数量分散到不同句子 |
| `customPrompt` | `string` | `''` | 附加风格/场景说明，不能改变模式、白名单或上限 |
| `settingsFile` | `string` | `''`（自动查找旧文件） | （进阶）旧 JSON 配置的导入路径；以后保存由 Harness 原生配置负责 |

## 旧配置自动迁移

首次加载后，从旧 `tdsh-emoji.json`（schemaVersion 1）导入到当前 profile 的 Harness 原生配置；新配置里已有的用户字段优先，旧值只补缺失项。

- 优先读取当前 Harness 数据目录，兼容旧的 `DSH_HOME/.dsh/` 嵌套路径。
- 原来的 `settingsFile` 自定义路径继续作为导入源；以后保存使用 Harness 配置。
- 原 JSON 保留不删；写入成功后同一笔提交保存 `migrationVersion: 1`，升级或重启不会重复覆盖。
- 恢复默认使用 Harness 的继承配置，并保留迁移标记，防止旧值回来。
- 文件损坏、无写权限或冲突会记录警告，不标记成功；修复后重启可重试。
- 迁移按 profile 进行；换电脑或更换整个数据目录时，需把原配置文件或 profile 一起带过去。

## 与 dsh-kaomoji 共存

| 插件 | 插入内容 | 位置 | 冲突处理 |
| --- | --- | --- | --- |
| dsh-kaomoji | 日式颜文字 `(´∀｀)` | 贴合情绪的句子之后 | 互不干扰：emoji 一侧明确禁止与颜文字同句/同行 |
| Tdsh-emoji | 标准 emoji 😊 | 贴合内容（可在句中） | `Never place an emoji in the same sentence or line as a kaomoji` |

两张设置卡片都在「设置 → 通用设置」（order 30 / 31），可以挨着调。

## 兼容性

仅支持 Harness **0.2.0-rc.2 ～ 0.2.1-rc.3** 已发布的 9 个版本（含 alpha.1–alpha.5、rc.1–rc.3）。新旧范围外版本不在本次支持承诺内；清单使用精确版本集合，避免预发布 semver 范围漏选。

界面通过官方 `remote.settings` 编辑 Host 配置；插件不注册 HTTP 路由，不依赖 `webServer`，也不把配置存在浏览器。Web 与桌面复用 Harness 自己的通信载体和认证。

详见 [兼容验证记录](./COMPATIBILITY.md)；后续 Harness 版本另行验证。

## 发布到 npm（维护者）

仓库根目录有一键发布脚本 `publish.cmd`（双击，或在终端里执行）：

```powershell
.\publish.cmd            # 用 package.json 里的当前版本号直接发布
.\publish.cmd patch      # 先 npm version patch（minor / major 同理），再发布
```

脚本依次做四件事：`npm test` → 检查 npm 登录（未登录会提示先执行
`npm login --registry https://registry.npmjs.org`）→ 可选地 bump 版本号 →
`npm publish --registry https://registry.npmjs.org`（`prepack` 会再跑一遍测试）。
发布完成后记得把版本号改动 commit + push 回 GitHub。

## 开发

```powershell
npm ci --legacy-peer-deps
npm test   # node:test 单测（提示词规则 + 原生设置迁移 + client 加载）
npm run test:compat  # 逐版本隔离验证官方运行时
npm pack   # 验证发布内容
```

```text
Tdsh-emoji/
├── lib/
│   ├── index.js       # Host：config、规则生成、提示词段、原生设置与迁移
│   ├── client.js      # Web：设置 → 通用设置 卡片
│   └── index.d.ts
├── data/catalog.json  # 情绪 -> emoji 白名单
├── test/
├── cordis.patch.yml
├── publish.cmd        # 一键发布到 npm
├── package.json
├── README.md / README.en.md
└── CHANGELOG.md
```

## dsh-market 新版本同步

仓库已经收录，新版本由市场目录的定时任务重新抓取 npm 元数据，不需要重复提交插件条目。

维护者本地交接文档与 market 同步脚本位于两个项目共同的父目录：`HANDOFF-Tdsh-emoji.md`、`sync-market-Tdsh-emoji.cmd`，不随插件分发。脚本默认只读检查，显式加 `--request-refresh` 才会在满 24 小时且目录仍旧时请求上游重抓；需要 `GH_TOKEN` 或 `GITHUB_TOKEN`。

[上游目录规则](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin/blob/main/contributing.md) · [市场页面](https://awesome-dsh-plugin.com/p/TianJie52009/Tdsh-emoji/)

## License

[MIT](./LICENSE)
