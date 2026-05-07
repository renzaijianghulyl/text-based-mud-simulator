# LLM 延迟观测与验收口径

## 目标

- 单轮平均耗时：20-30 秒（CLI 与小程序共享引擎路径）。
- 关键指标：
  - `process-total`：一轮总耗时
  - `llm-call`：模型请求耗时
  - `build-prompt`：构建提示词耗时
  - `parse-response`：解析耗时

## 日志来源

- 引擎日志：`src/engine/logger.ts` 与 `src/engine/engine.ts`
- 当某步骤样本数达到 5 条后，会自动打印：
  - `avg`
  - `p50`
  - `p95`
  - `n`

示例日志：

`[engine:info] llm-call — latency avg=28012ms p50=24110ms p95=38900ms n=10`

## 回归建议

1. CLI 连续 10 轮（短输入与长输入各 5 轮）。
2. 小程序首轮 5 次 + 续玩 5 次。
3. 观察 `process-total` 与 `llm-call` 的 p50/p95，确认是否进入目标区间。

## 运行命令

```bash
CLI_USER_ID=bench CLI_SCENARIO_ID=hulaguan npm run play
```

建议在 `.env` 中固定同一组模型配置，避免不同 provider 切换导致统计不可比。
