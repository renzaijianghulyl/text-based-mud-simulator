# Changelog

本文件记录面向库使用者与贡献者的显著变更。

## [Unreleased]

### Added

- `SessionStore` 接口与 `FileSessionStore` 实现；`SCENARIOS_ROOT` / `SESSIONS_DIR` 环境变量。
- 本地 HTTP 服务 `npm run http:interact`（`src/http/interact-http-server.ts`）。
- 开源文档：`CONTRIBUTING.md`、`SECURITY.md`、`docs/ARCHITECTURE.md`、`docs/CONFIGURATION.md`、`docs/GOVERNANCE.md`、`docs/scenario-pack.md`、`NOTICE`。

### Changed

- 微信云数据库与内容安全模块迁至 `src/adapters/wechat/`。
- `wx-server-sdk` 调整为 `optionalDependencies`；根依赖移除未使用的 `react`。
- Vitest 覆盖率：全局 `branches` 阈值调整为 72%（纳入 `FileSessionStore` 后基线）。
