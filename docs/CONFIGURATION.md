# 配置说明

环境变量从 `.env` 加载（见项目根目录 `dotenv` 用法）。模板见 [`.env.example`](../.env.example)。

## LLM 主备路由

| 变量 | 说明 |
|------|------|
| `PRIMARY_LLM_API_KEY` | 主路由 API Key（也可用 `LLM_API_KEY` 作为兼容名） |
| `PRIMARY_LLM_API_URL` | 主路由兼容 OpenAI 的 Chat Completions URL |
| `PRIMARY_LLM_MODEL` | 主路由模型名 |
| `FALLBACK_LLM_API_KEY` | 备路由 Key |
| `FALLBACK_LLM_API_URL` | 备路由 URL |
| `FALLBACK_LLM_MODEL` | 备路由模型名 |

更细的请求超时、重试、温度等见 `src/engine/llm-adapter.ts` 中的环境变量读取逻辑。

## Prompt 档位

| 变量 | 说明 |
|------|------|
| `PROMPT_PROFILE` | `auto`（默认按意图与上下文推断）、`fast`、`balanced`、`rich` |

## 剧本与会话路径

| 变量 | 说明 |
|------|------|
| `SCENARIOS_ROOT` | 剧本包根目录的绝对或相对路径；未设置时默认为 `<cwd>/scenarios` |
| `SESSIONS_DIR` | 本地会话 JSON 目录；未设置时默认为 `<cwd>/.sessions` |

CLI、冒烟测试与 `npm run http:interact` 均使用上述默认文件存储。

## 本地 HTTP 服务

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `HTTP_INTERACT_HOST` | `127.0.0.1` | 监听地址 |
| `HTTP_INTERACT_PORT` | `8787` | 监听端口 |

## 微信内容安全（仅云函数 / 适配层）

| 变量 | 说明 |
|------|------|
| `CONTENT_SECURITY_ENABLED` | 设为 `0`、`false`、`off`、`no` 可关闭 msgSecCheck（仅建议本地调试） |

## 依赖说明（`wx-server-sdk`）

`wx-server-sdk` 列在根目录 `package.json` 的 **`optionalDependencies`** 中：微信云函数打包与类型解析需要；纯本地跑 CLI / HTTP / 单元测试时，若你的环境选择 `npm install --no-optional`，需自行确保不会编译引用该适配层的入口（本仓库默认 `tsc` 仍包含 `src/adapters/wechat`，一般需要安装 optional 或通过自有构建排除该目录）。

云函数独立产物见 `cloud-dist/interact/package.json`，上传后在该目录执行 `npm install` 安装 `wx-server-sdk`。

## CLI 专用

| 变量 | 说明 |
|------|------|
| `CLI_USER_ID` | 默认 `chief` |
| `CLI_SCENARIO_ID` | 默认 `hulaguan` |
| `CLI_NPC_ID` | 可选，指定初始 NPC |
