# 参与贡献

感谢你愿意改进本项目。提交前请先阅读 [仓库治理说明](./docs/GOVERNANCE.md)：我们以**单一主干**为事实来源，避免在平行分支上重复维护两套引擎逻辑。

## 开发环境

- Node.js 18 或以上
- 复制 `.env.example` 为 `.env` 并配置 LLM Key（跑通带真实 LLM 的冒烟测试时需要）

## 常用命令

```bash
npm install
npm run test          # TypeScript 类型检查（tsc --noEmit）
npm run test:unit     # Vitest 单元测试
npm run test:all      # 以上两者
npm run build         # 编译到 dist/
npm run play          # 本地 CLI 交互（需先 build）
npm run http:interact # 本地 HTTP 服务（需先 build）
```

小程序前端依赖在 `src/frontend`，需单独安装：

```bash
cd src/frontend && npm install
```

## 目录与 PR 范围

| 区域 | 说明 |
|------|------|
| `src/engine/`、`src/types.ts`、`src/errors.ts` | 叙事与导演引擎核心 |
| `src/sessions/`（除微信适配外） | 文件会话、`SessionStore` 抽象、配额等 |
| `src/adapters/wechat/` | 微信云数据库、内容安全（依赖 `wx-server-sdk`） |
| `src/functions/interact/` | 云函数入口，编排引擎与微信适配 |
| `src/http/` | 无微信依赖的本地 HTTP 演示入口 |
| `src/cli/` | 命令行入口 |
| `src/frontend/` | Taro 小程序 UI |
| `scenarios/` | 剧本数据（仓库内为只读策划约定；改动需与维护者对齐） |

请让 PR 聚焦单一主题（例如只修解析器或只补文档），便于审查。

## 代码风格

- TypeScript，`strict` 模式
- 避免无必要的 `any`
- 与现有文件保持一致的命名与导出风格

## 提交前自检

- `npm run test:all` 通过
- 若改动云函数打包路径，执行 `npm run build:cloud-interact` 确认可构建
