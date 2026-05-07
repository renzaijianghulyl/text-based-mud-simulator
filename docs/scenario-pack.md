# 剧本包（Scenario Pack）快速说明

本文面向**要在本仓库中新增或打包剧本**的贡献者与二次开发者。更完整、与引擎字段一一对照的规范见 [剧本构造方法与高标准规范](./scenario-construction-standard.md)。

## 放置位置

- 默认目录：`<项目根>/scenarios/<scenarioId>/`（相对 **Node 进程当前工作目录** `process.cwd()`）。
- 自定义根目录：设置环境变量 **`SCENARIOS_ROOT`** 为绝对路径或相对路径，则剧本根为 `SCENARIOS_ROOT/<scenarioId>/`。参见 [配置说明](./CONFIGURATION.md)。

在 monorepo 子目录中启动 CLI 时，若发现读不到剧本，请显式设置 `SCENARIOS_ROOT` 指向仓库根的 `scenarios` 目录。

## 目录结构（推荐）

```
scenarios/<scenarioId>/
├── config.json                 # 必需：剧本元数据、卡司、开场参考等
├── historical-context.json     # 强烈建议：历史约束、关系称谓等
├── emotional-beats.json        # 可选：情感与群像节拍（虎牢关级剧本建议保留）
├── npcs/
│   ├── <npc-id>.json           # 每个可交互 NPC 一人设文件
│   └── ...
├── events/                     # 可选：当前引擎 buildPrompt 未统一读取，可作策划资产
├── geography/                  # 可选：locations 等，作一致性参考
└── backstory.md                # 可选：人类可读长文，当前不进 LLM
```

**引擎当前会读入 prompt 的文件**与 [scenario-construction-standard 第 2 节](./scenario-construction-standard.md) 中的表格一致；新增文件若未在 `prompt-builder` 中接线，则不会自动影响生成。

## 最小可运行集（从零开始）

1. **`config.json`**：`id`、卡司相关字段（如 `availableNpcs`、`defaultTarget`）、推荐包含 `openingNarration`、`openingPlayerHint`（开局锚点，见高标准文档第 3 节）。
2. **`npcs/<id>.json`**：`availableNpcs` 中每位至少一个 JSON；字段至少覆盖 `id`、`name`、人设相关文案（与现有虎牢关文件对齐即可）。
3. **`historical-context.json`**：历史类剧本强烈建议提供，否则导演约束偏弱。

将 `scenarioId` 与 CLI / HTTP / 云函数传入的 `scenarioId` 保持一致。

## 虎牢关与静态 NPC 注册表

- **本地 CLI / 默认文件会话**：`scenarioId === 'hulaguan'` 时，NPC 模板可走 **内置静态表**（`src/sessions/hulaguan-npc-static.ts` 与 `hulaguan-npc-registry.generated.ts`），也可与 `scenarios/hulaguan/npcs/*.json` 对齐使用。
- **微信云函数 bundle**：构建脚本 `npm run codegen:hulaguan-npcs` 会根据 `scenarios/hulaguan/npcs/` 下的 JSON **重新生成**注册表 TS，供云环境无磁盘读剧本时使用。若你只维护开源文件路径、不发布微信 bundle，可忽略该步骤；发布云函数前需执行 `npm run build:cloud-interact`（内含 codegen）。

## 扩展 `scenarioId` 时的代码注意点

- [`src/engine/scenario-narrative-hint.ts`](../src/engine/scenario-narrative-hint.ts) 内按 `scenarioId` 映射「剧本类型」一句提示；未登记时回落为**通用**调性。新剧本若要固定战争/宫廷等语气，请在此增加映射，或在 `historical-context` 中用足够强的文字约束风格。
- 云数据库 MVP 路径（`src/adapters/wechat/cloud-session-store.ts`）当前对 `scenarioId !== 'hulaguan'` 的 **新建会话** 会抛错；扩展多剧本时需同步放宽该限制并实现对应 NPC 加载策略。

## 内容版权与史实边界

- 本仓库剧本示例基于**公有领域史实与文学传统形象**进行原创描写；你新增的剧本与文案需自行确保**版权与合规**（不使用受版权保护的现代衍生作品设定与台词）。
- 勿将剧本用于生成违反适用法律法规或平台政策的内容。

## 进一步阅读

- [剧本构造方法与高标准规范](./scenario-construction-standard.md) — 字段级说明、开局契约、质量红线、Agent 任务模板。
