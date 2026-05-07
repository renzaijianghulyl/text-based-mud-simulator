# interact 与小程序联调测试清单

## 本地构建（上传前）

- 根目录执行 `npm run build:weapp`：委托 `src/frontend` 编译，产物在 `src/frontend/dist/`；用微信开发者工具**打开仓库根目录**时，`miniprogramRoot` 已由根目录 [`project.config.json`](../project.config.json) 指向 `src/frontend/dist/`。
- 根目录执行 `npm run build:cloud-interact`：生成 `cloud-dist/interact/index.js`；进入 `cloud-dist/interact` 执行 `npm install` 安装 `wx-server-sdk` 后，将该目录作为云函数上传。

## 云函数 interact

- [ ] `isNew=true`：创建会话，`sessionId` 与当前用户 OPENID 对应。
- [ ] 连续两轮 `isNew=false` + 合法 `intent`：`currentRound`、HP、关系与摘要合理更新。
- [ ] `isNew=true` 再次调用：旧会话被覆盖或不可见。
- [ ] `isNew=false` 且无会话：返回 `SESSION_EXPIRED` 与约定文案。
- [ ] 触发解析失败路径：用户侧为「生成失败，请重试」。

## 内容安全（msgSecCheck）

> 部署前置：在微信云开发控制台为 `interact` 云函数开启「云调用权限 → security.msgSecCheck」；不开启会触发 fail-closed 全部走 `CONTENT_CHECK_UNAVAILABLE`。
>
> 默认开启；本地调试可在云函数运行环境设置 `CONTENT_SECURITY_ENABLED=0` 关闭审核（生产严禁关闭）。

- [ ] 普通轮违规 `intent`（如官方提供的违规测试串）：返回 `CONTENT_RISK_USER`，文案「输入包含违规内容，请修改后重试」；不消耗配额、不写库、未触达 LLM 计费。
- [ ] AI 输出违规（用 prompt 引导生成敏感词）：返回 `CONTENT_RISK_AI`，文案「本轮剧情未通过审核，请重新尝试」；不消耗配额、不写库、HP/关系不变。
- [ ] `isNew=true` 且 OC `playerRoleProfile.name/background` 含违规内容：返回 `CONTENT_RISK_USER`，旧会话不被覆盖。
- [ ] 临时关闭云函数 OpenAPI 权限或断网：返回 `CONTENT_CHECK_UNAVAILABLE`，文案「内容审核暂不可用，请稍后再试」（fail-closed）。
- [ ] 单段超长（>2500）AI 输出：分段调用通过后整体放行；任一段命中违规则整体拒绝。

## 小程序

- [ ] 请求体不包含可伪造的 `userId`。
- [ ] Loading 与错误 Toast 与 `docs/weapp-mvp-error-codes.md` 一致；新增码 `CONTENT_RISK_USER` / `CONTENT_RISK_AI` / `CONTENT_CHECK_UNAVAILABLE` 的 Toast 文案与正向引导。
- [ ] 快捷意图为中文且能完成至少一轮互动。

## 真机

- [ ] iOS、Android 各至少 1 轮完整互动与 1 次错误恢复（如超时重试）。
- [ ] iOS、Android 各覆盖一次违规输入与一次违规输出回归。
