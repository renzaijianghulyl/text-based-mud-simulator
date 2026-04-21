# interact 与小程序联调测试清单

## 本地构建（上传前）

- 根目录执行 `npm run build:weapp`：委托 `src/frontend` 编译，产物在 `src/frontend/dist/`；微信开发者工具「本地设置」中 `miniprogramRoot` 指向该目录（见 `src/frontend/project.config.json`）。
- 根目录执行 `npm run build:cloud-interact`：生成 `cloud-dist/interact/index.js`；进入 `cloud-dist/interact` 执行 `npm install` 安装 `wx-server-sdk` 后，将该目录作为云函数上传。

## 云函数 interact

- [ ] `isNew=true`：创建会话，`sessionId` 与当前用户 OPENID 对应。
- [ ] 连续两轮 `isNew=false` + 合法 `intent`：`currentRound`、HP、关系与摘要合理更新。
- [ ] `isNew=true` 再次调用：旧会话被覆盖或不可见。
- [ ] `isNew=false` 且无会话：返回 `SESSION_EXPIRED` 与约定文案。
- [ ] 触发解析失败路径：用户侧为「生成失败，请重试」。

## 小程序

- [ ] 请求体不包含可伪造的 `userId`。
- [ ] Loading 与错误 Toast 与 `docs/weapp-mvp-error-codes.md` 一致。
- [ ] 快捷意图为中文且能完成至少一轮互动。

## 真机

- [ ] iOS、Android 各至少 1 轮完整互动与 1 次错误恢复（如超时重试）。
