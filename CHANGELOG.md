# Changelog

All notable changes to **tdsh-emoji** are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/lang/zh-CN/).

## [Unreleased]

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
