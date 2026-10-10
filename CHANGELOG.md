# Changelog

All notable changes to **tdsh-emoji** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

## [Unreleased]

## [0.2.0] - 2026-10-10

### Changed

- 适配 DeepSeek Harness `0.2.0-rc.2`：dsh 0.2 起会在启动时按运行时版本校验插件
  声明的 `@deepseek-ai/dsh-*` peer 范围，范围不满足的 bundle 会被整体跳过
  （日志 `dsh: skipping profile bundle "tdsh-emoji": ... incompatible`）。
  所有 dsh peer 现在声明为 `^0.2.0-rc.2 || ^0.1.0-rc.7`，0.1.x（含 0.1.5-rc.2）
  与 0.2.x 两条运行时线都能加载。
- 移除 `@deepseek-ai/dsh-client-runtime` 声明（`peerDependencies` 与
  `dsh.client.inject` 两处）：该包在 dsh 0.2 客户端里已不存在。
- 补充实际用到的 peer 声明：`@deepseek-ai/dsh-host-webserver`（设置路由
  `POST /tdsh-emoji-settings`）与 `@deepseek-ai/dsh-client-connection`
  （客户端 `connection/reset` 后自动重读设置）。
- `package.json`：新增 `dsh.manifestVersion: 1` 与 `engines.dsh` 兼容范围；
  版本号 0.1.1 → 0.2.0。
- 已在 dsh 0.2.0-rc.2 的真实 web profile 上验证：插件正常挂载、设置路由注册、
  `get`/`save` 读写正常、客户端 bundle 进入 `window.__DSH_BOOT__` 启动图。

## [0.1.1] - 2026-09-25

### Changed

- 放置规则从「贴合情绪的句子之后」改为「**贴合内容**」：emoji 放在最匹配的
  词、短语或句子旁边，可以在句子中间，不再默认追加到句尾。

## [0.1.0] - 2026-09-25

### Added

- 首个版本：向 dsh 系统提示词注入「情绪 → 标准 emoji」白名单规则，emoji 贴合
  对应情绪的句子/短句之后。
- 三种模式 `off` / `auto` / `frequent`，默认 `auto`；单条回复上限 `maxPerTurn`
  （1–10，默认 3）。
- 放置位置 `inline`（贴合句子，默认）/ `end`（回复结尾）。
- 与 dsh-kaomoji 共存：规则禁止 emoji 与颜文字出现在同一句/同一行，两者会自动
  分散到不同句子；设置卡片同在「设置 → 通用设置」。
- 设置卡片通过同源路由 `POST /tdsh-emoji-settings` 读写 `~/.dsh/tdsh-emoji.json`，
  Tailscale/局域网/SSH 转发都能保存，保存即生效。
- 零第三方运行时依赖；内置 `node:test` 单测。
