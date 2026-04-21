# 云函数 interact 与前端错误文案统一表

| `code` | 用户可见 `message` | 触发场景 |
|--------|----------------------|----------|
| `OK` | （成功时可空） | 处理成功 |
| `LLM_TIMEOUT` | 响应超时，请重试 | LLM 传输/超时类错误（与引擎策略一致） |
| `PARSE_FAILED` | 生成失败，请重试 | 解析或结构校验失败 |
| `SESSION_EXPIRED` | 会话已过期，请重新开始 | 无会话且非新开 |
| `EMPTY_INTENT` | 请输入你的行动或对话 | 意图为空 |
| `DB_ERROR` | 网络异常，请稍后重试 | 云数据库读写异常（`CloudDatabaseError`） |
| `UNAUTH` | 请重新进入小程序后再试 | 无 OPENID |
| `UNKNOWN` | 生成失败，请重试 | 其他未分类错误 |

约定：云函数返回 `{ success: boolean; code: string; message: string; ... }`；前端仅展示 `message`，不向用户暴露 stack 或原始错误码（可选在日志中记录 `code`）。
