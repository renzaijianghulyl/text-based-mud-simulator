# Changelog

本文件记录面向库使用者与贡献者的显著变更。

## [Unreleased]

### Added

- 解析期 **`dialogue.speaker` 契约**：[`npc-dialogue-speaker-policy`](src/engine/npc-dialogue-speaker-policy.ts) 按剧本卡司名/别名与「你」校验；虎牢关、赤壁另允许少量群像称谓（传令兵、士卒等）。非法 speaker 触发 `ParseResponseError` 与既有 LLM 结构重试。
- OC 背景命中坐骑/异兽等关键词时，[`prompt-builder`](src/engine/prompt-builder.ts) 注入【玩家：非人/坐骑侧】导演短条。
- Prompt 中 **【空间锚（软锁）】**：锚定 `cumulativeState.environment.location`，约束无铺垫跳场。
- `SessionStore` 接口与 `FileSessionStore` 实现；`SCENARIOS_ROOT` / `SESSIONS_DIR` 环境变量。
- 本地 HTTP 服务 `npm run http:interact`（`src/http/interact-http-server.ts`）。
- 开源文档：`CONTRIBUTING.md`、`SECURITY.md`、`docs/ARCHITECTURE.md`、`docs/CONFIGURATION.md`、`docs/GOVERNANCE.md`、`docs/scenario-pack.md`、`NOTICE`。

### Changed

- [`prompt-director-markdown`](src/engine/prompt-director-markdown.ts)：在重要原则中补充「未入卡司人物宜走 narration/action，勿用陌生正名作 dialogue speaker」的软约束（不枚举禁名表）。
- 微信云数据库与内容安全模块迁至 `src/adapters/wechat/`。
- `wx-server-sdk` 调整为 `optionalDependencies`；根依赖移除未使用的 `react`。
- Vitest 覆盖率：全局 `branches` 阈值调整为 72%（纳入 `FileSessionStore` 后基线）。
