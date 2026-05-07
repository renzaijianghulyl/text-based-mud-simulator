# 剧本构造方法与高标准规范（详细版 · 供 Agent 执行）

本文对齐**当前仓库**中的虎牢关剧本包与引擎实现，用于指导新增或重构 `scenarios/<scenarioId>/`。目标：**可运行、可注入 prompt、历史与群像可约束、开局有锚点、长会话可验收**。

---

## 0. 文档地图（按需跳转）

| 章节 | 内容 |
|------|------|
| §1 | 适用范围、与会话/引擎的关系 |
| §2 | **引擎读哪些文件**（与 prompt 段落对应） |
| §3 | **开局首轮**契约（`opening-intent.ts` + `config` 开场字段） |
| §4 | 推荐构造流程（分阶段） |
| §5 | **config.json** 逐字段说明 |
| §6 | **historical-context.json** 逐块说明 |
| §7 | **npcs/*.json** 与人际网 |
| §8 | **events/*.json** |
| §9 | **emotional-beats.json**（含实现级行为） |
| §10 | **geography**、**backstory.md** |
| §11 | 与「玩家身份」的关系（非剧本 JSON，但影响开局） |
| §12 | 数值与叙事对齐 |
| §13 | 质量红线 |
| §14 | 交付物与自检清单 |
| §15 | 给另一 Agent 的任务模板 |

**参考目录**：`scenarios/hulaguan/`（扩展卡司、`npcRoles`、`dramaticRelationships`、`emotional-beats.json`、`openingPlayerHint`、`geography/locations.json`、`backstory.md`）。

---

## 1. 适用范围与硬约束

- 剧本数据仅放在 `scenarios/<scenarioId>/`，**只读**；会话状态（HP、关系、历史、`playerRoleProfile` 等）由引擎/存储写入，**不回写**剧本文件。
- 会话键：`sessionId` 与 `userId`、`scenarioId` 组合相关（见 `session-manager`）；剧本只描述**初始世界与导演约束**。
- 叙事主体仍由 LLM 按轮生成 JSON（`scenes` + `stateChanges`）；剧本 JSON 负责**把约束与素材喂进 prompt**，并在部分字段上触发**日志级校验**（非全部硬失败）。

---

## 2. 引擎实际消费的剧本文件（与 prompt 对应）

下列对应 `prompt-builder` 等模块的读取行为（**未列出的文件当前不进 prompt**）。

### 2.1 总表

| 路径 | 在 prompt 中的典型位置 | 必需性 |
|------|------------------------|--------|
| `config.json` | 卡司名单 **【卡司与点名】**；开局轮另见 §3 | **必需** |
| `historical-context.json` | **【历史背景与约束】**、**【人物关系与称谓】**、**【联军人物戏剧关系】**（有则注入） | 历史/战争本 **强烈必需** |
| `npcs/<id>.json` | 卡司名/字拼装；当前主 NPC 人设块 | `availableNpcs` 内 **每人一文件** |
| `emotional-beats.json` | **【群像节拍】**、**【情感高潮引导】** | 可选；虎牢关级建议 **必有** |
| `events/*.json` | **当前未由本引擎在 buildPrompt 中读取** | 可作策划/后续意图路由 |
| `geography/locations.json` | **当前未注入 prompt** | 策划与一致性 **推荐** |
| `backstory.md` | **不读取** | 人类/Agent 长文说明 |

### 2.2 代码侧「剧本类型」句

`src/engine/scenario-narrative-hint.ts` 按 `scenarioId` **硬编码**映射「剧本类型」一行。新剧本若不增映射，会得到 **「通用」** 提示；若需要固定调性（战争、宫廷等），要么改该文件增加 `scenarioId`，要么在 `historicalNotes` / `description` 里写足够强的风格约束。

### 2.3 单轮 prompt 大致顺序（便于写「不重复、不打架」的文案）

开局轮（意图以 `【开局】` 开头）时，在常规块之前会多一段 **【开局旁白导演】** 与开场参考（§3）。非开局轮顺序概要如下：

1. **【剧本类型】**（narrative-hint）  
2. **【历史背景与约束】**（historical-context，clip）  
3. **【人物关系与称谓】**（当前主 NPC 视角，`relationships`）  
4. **【联军人物戏剧关系】**（当前主 NPC 相关的 `dramaticRelationships` 边）  
5. **【群像节拍】**（emotional-beats，clip）  
6. **【情感高潮引导】**（emotional-beats，clip）  
7. **【系统指令】** + 导演原则块（代码常量）  
8. **【NPC 人设】**、**【卡司与点名】**、**【群像与轮次弹性】**  
9. 关系数值、关键事件、滚动摘要、环境记忆、玩家意图、输出 JSON 格式说明等。

写剧本时：**硬史实地名/事件**优先放在 `historical-context`（会进早期块）；**分幕节奏**放在 `emotional-beats`；**谁站什么队、军议谁上座**放在 `dramaticRelationships` + `npcRoles`。

---

## 3. 开局首轮契约（与 `config` 开场字段）

引擎使用 `src/engine/opening-intent.ts`：

- 若用户意图为 **`【开局】` 开头**（`OPENING_ROUND_MARKER`），则视为**开局环境轮**：只铺时空与氛围，**不代替玩家行动**。
- 该轮会注入常量 **【开局旁白导演】**（`OPENING_PROMPT_DIRECTOR`），并要求：以 narration 为主、dialogue 至多一句且宜短、`stateChanges.hp` 与 `relationship` **均为 0**（由调用方/导演约束配合，剧本侧需理解此语义，勿在开场文案里暗示已发生数值变化）。

### 3.1 `config.json` 中与开局相关的字段

| 字段 | 是否必需 | 注入名 | 说明 |
|------|----------|--------|------|
| `openingNarration` | 强烈推荐 | **【剧本开场参考】** | 宏观开场：时间、局势、矛盾；可被 clip，宜 80～220 字内信息密度高。 |
| `openingPlayerHint` | 强烈推荐 | **【首局情境提示】** | **此刻玩家在哪、能感知到什么**；明确写「玩家尚未行动」「留白钩子」；引擎提示：融入氛围、**勿逐字照抄**、勿替玩家决定。 |

**写作要求（对齐当前虎牢关范例）**

- `openingNarration`：偏**史观/大势**（谁专权、谁为盟主、关隘意义）。
- `openingPlayerHint`：偏**第一人称可代入的空间锚点**（营、帐、远处关隘声、传令斥候）；列出 2～3 类**可探索方向**（打听、趋近、观察、请见），但**禁止命令式**（不要写「你应当去…」）。

---

## 4. 推荐构造流程（分阶段）

### 阶段 A：锚点与禁线

1. 定 `period`（年号、公元年、季节、一句事件脉络）。  
2. 定 `location.current`、叙事用后方/根据地表述（当前类型里为 `caoCaoBase` 一类字段）、`forbiddenLocations`。  
3. 列 `forbiddenEvents`：**需要引擎硬提示的 hard 项必须带非空 `keywords`**（见 §6）。  
4. 写 `historicalNotes`：盟主位阶、阵营从属、演义/史书边界、勿后见之明。

### 阶段 B：人物网

5. `characters.present`：每条 `npcId` + `role` + `status`（`active` / `ally` / `enemy` / `alive` 等，与策划表一致即可，引擎主要作展示性拼入）。  
6. `characters.absent`：`reason`、`forbiddenUntil`（可选）、`labels`（与 NPC 文件 name/aliases 合并做台词校验）、`forbidDialogueSpeaker`（**省略默认为 true**：不宜以前线 dialogue **正名**出场）。  
7. `relationships`：从若干关键 `from` 出发的**称谓与禁称**（服务当前主 NPC 视角块）。  
8. `dramaticRelationships`：有向边 `from → to`，`public` / `private` 的 `tone` + `note`（**公开场合体面** vs **内心保留**），与讨董/联军阶段语气一致。

### 阶段 C：卡司与文件

9. `config.availableNpcs` 与 `npcs/*.json` **一一对应**；`defaultTarget` 必须在列表中且文件存在。  
10. `npcRoles`：**建议每个 `availableNpcs` id 都有一句**；若只写子集，主公/主反派也建议补上，避免卡司注只有侧翼。  
11. `openingNarration` + `openingPlayerHint`（§3）。

### 阶段 D：节拍与地理

12. `emotional-beats.json`：群像窗口、可选演义层、情感模板与抑制（§9）。  
13. `geography/locations.json`：与禁地、在场人物一致（§10）。  
14. `events/*.json`：与策划案对齐（§8）。  
15. `backstory.md`：长文；与 JSON **事实一致**（勿与 `present`/`historicalNotes` 矛盾）。

---

## 5. `config.json`（剧本入口）详细说明

### 5.1 必填与推荐

| 字段 | 类型 | 要求 |
|------|------|------|
| `id` | string | 与目录名 `scenarios/<id>` 一致。 |
| `name` | string | 显示名。 |
| `description` | string | 约 50～200 字：时空 + 玩法（原创角色/扮演历史人物等）。 |
| `version` | string | 建议 semver；便于迭代 diff。 |
| `era` / `eraFeatures` | string | 时代与关键词短语。 |
| `openingNarration` | string | 见 §3。 |
| `openingPlayerHint` | string | 见 §3；**高标准剧本强烈建议与虎牢关同级**。 |
| `availableNpcs` | string[] | 每项为 **npc 文件名不含 `.json`**；**dialogue speaker 正名**须与对应 NPC 的 `name` 一致。 |
| `defaultTarget` | string | 默认对谈 NPC；须在 `availableNpcs` 中。 |
| `npcRoles` | Record\<string, string\> | **推荐全覆盖** `availableNpcs`：一句职能、阵营站位、军议/阵前分工。 |

### 5.2 卡司与引擎行为

- `scenario-ensemble-hint` 会按 `availableNpcs` 顺序读取各 NPC 的 `name` 与 `aliases`，拼 **【本剧本可出现台词的 NPC】**，过长会 **截断名单**（保留前列）。因此：**越常被点名的角色 id 越宜靠前**，或控制别名总量，避免尾部角色永远进不了 prompt。  
- `npcRoles` 按同一 `availableNpcs` 顺序拼接为 **【卡司职能短注】**，也有长度上限；**单条 role 宜一句 40～80 字内**，忌长篇列传。

---

## 6. `historical-context.json` 详细说明

### 6.1 `period`

- `year`：数字公元年（剧本锚点）。  
- `eraName`、`season`、`event`：进入 **【历史背景与约束】** 首行附近。

### 6.2 `location`

- `current`：主场景一句话。  
- `caoCaoBase`：在当前类型定义里为**叙事用后方/根据地表述**；若新剧本不是曹操线，仍建议**复用该键名**（引擎写死读取）或**同步改 `historical-context.ts`** 后再改 JSON 键名。  
- `forbiddenLocations`：子串出现在生成文本中会触发 **日志告警**（`collectHistoricalWarnings`），宜列后期都城、错置地名等。

### 6.3 `characters.present` / `absent`

- `present`：`npcId`、`role`、`status`、可选 `note`（重要阵营说明写进 `note`，如「随刘备，不在曹操阵营」）。  
- `absent`：  
  - `forbidDialogueSpeaker === false`：允许被提及，但**仍不应**违反 `reason`（如荀彧勿升帐主议）。  
  - 默认 `true`：dialogue 的 `speaker` 不应使用该人物姓名（与 labels 合并校验）。

### 6.4 `forbiddenEvents`

- `severity: "hard"` 且 `keywords` **非空**：进入「硬性避免在叙事中当作已发生」列表，并做子串告警。  
- `severity: "soft"`：`keywords` 可为空；仅作软提示段落，**不**走关键词硬告警逻辑。  
- 每条建议有 `label`、`reason`，可选 `actualYear`。

### 6.5 `historicalNotes`

- 条数建议 **≥ 6**（虎牢关级）；覆盖：官制地名、从属关系、盟主与诸侯公开礼仪、诸侯暗线、华雄/演义与史书口径、玩家乱入典故时的纠偏策略等。

### 6.6 `relationships`（称谓表）

- 仅 **`from` 等于当前主 NPC id** 的条目会进入 **【人物关系与称谓】**。  
- 字段：`to`、`relationship`、`addressForm`、`forbiddenAddress?`、`knowledgeLevel`、`note?`。  
- 引擎会对**当前主 NPC 的 dialogue** 做宽松 **禁称检测**（`collectAddressWarnings`），排除「转述/世人称」等引号语境启发式。

### 6.7 `dramaticRelationships`（戏剧关系，非称谓替代）

- 结构：`from`、`to`、`public`（必填）、`private`（可选），内层为 `tone`、`note`。  
- 注入时筛选 **与当前主 NPC 作为 `from` 或 `to` 的边**，clip 后进入 **【联军人物戏剧关系】**。  
- 用于：**同一件事公开场合怎么说 vs 心里怎么想**；与 `relationships` **并列**，勿删其一。

### 6.8 `addressRules`

- `description` + `rules[]`：全局称谓原则，进入称谓块尾部。

---

## 7. `npcs/<npcId>.json` 详细说明

### 7.1 建议字段

| 字段 | 说明 |
|------|------|
| `id` | 与文件名、`availableNpcs` 一致。 |
| `name` | **台词 speaker 正名**；与卡司列表一致。 |
| `aliases` | 供玩家点名与名单列举；勿把「剧情禁称」放在此当别名用。 |
| `title` | 爵位/号/官职简称等。 |
| `personality` / `motivation` / `speakingStyle` | 须**可指导台词**；避免「很厉害」「很聪明」。 |
| `equipment` / `mount` | 列表与字符串；进入人设块。 |
| `relationships` | `Record<npcId, { initial: number, label: string }>`；`npcId` 建议指向本剧本其他卡司。 |
| `redLines` | 字符串数组，建议 ≥ 3；与战斗 `redLineEffects`、叙事激怒点对齐更佳。 |
| `era` / `eraFeatures` | 可选；与全局一致时可写。 |

### 7.2 高标准

- 关键阵营 NPC 的 `relationships` 至少覆盖：**盟主/主公、本阵核心、主要敌对阵营各 1～2 人**。  
- `speakingStyle` 写明**自称、句式长短、常见语气**（如「简短、自称某家」）。

---

## 8. `events/*.json` 详细说明

当前引擎 **不在** `buildPrompt` 中读取事件文件；仍建议保留为**策划单点真相**，并与未来「意图 → 事件」路由对齐。

### 8.1 通用形状

- `id`、`name`、`type`：`instant` | `conditional`。  
- `triggers`：中文动词短语数组；**跨事件去重**，避免大量事件共用同一触发词。  
- `effects`：`hp`、`relationship` 建议为**整数增量**；可扩展 `status` 字符串（须与叙事一致）。  
- `description`：一句人话说明设计意图。

### 8.2 条件事件

- `successRate`：键名为条件描述（如 `hp_gt_80`），值为 0～100 成功率；**键名须在策划文档中解释**，避免只有作者能懂。

### 8.3 战斗与红线

- 可参考 `combat.json`：`redLineEffects` 按意图子类型（如 `assassinate`）覆盖更重伤害；**策划上**须与 NPC `redLines` 可对应。

---

## 9. `emotional-beats.json` 详细说明（实现级）

由 `scenario-emotional-hint.ts` 读取；两段输出：**群像节拍**、**情感高潮引导**（均有字符上限，宜精炼）。

### 9.1 顶层字段

| 字段 | 作用 |
|------|------|
| `styleTone` | 全剧情感基调（克制、忌现代心理学术语等）。 |
| `ensembleBeats` | 指定 `triggerRounds` 与当前 `totalRounds` 命中时，注入强/弱群像调度句。 |
| `optionalRomanceBeats` | 演义或史向「可选幕」；含**确定性概率签**。 |
| `beatTemplates` | 情感短幕模板；**精确轮次命中优先**，否则按 `floor(totalRounds/3) % len` 轮转 fallback。 |
| `triggerHints` / `suppressionHints` | 文档化节奏建议（实现主要用模板与内置抑制）。 |
| `emotionalIntensity` | `low` / `medium` / `high` 文案。 |
| `intensityRules` | 与引擎内 `resolveAllowedIntensity`（约 10/20 轮分界）**一致书写**，避免文档与代码体感冲突。 |
| `dos` / `donts` | 短句列表，注入情感段尾部。 |

### 9.2 `ensembleBeats`

- `triggerRounds`：与引擎 **`cumulativeState.totalRounds`** 相等则命中（**不是**「每 N 轮」自动循环，未写的轮次不触发）。  
- `participants`：须全部为 **`config.availableNpcs` 且存在 npc 文件**。  
- `suppressKeywords`：取**最近至多 3 条**滚动摘要拼成一串，若包含任一关键词则该节拍 **弱化**（提示改为背景一句/押后）。  
- `directorNote`：直接指导模型分幕；军议类宜写明 **「2+ 独立 dialogue、不同 speaker」**。

### 9.3 `optionalRomanceBeats`

- `triggerRounds`：同上，按轮次命中后进入抽签逻辑。  
- `triggerProbability`：缺省视为 1；否则与 `deterministicBeatRoll(scenarioId, round, name)` 比较，`roll < p` 为「强推荐」，否则为「弱提示」（文案分支见源码）。  
- `layer`：  
  - `romance_optional`：演义套层，提示中会出现「（演义可选层）」类语义。  
  - `historical_canon`：正史向参考，勿把轶闻写为定论。  
- `historicalNote`：**必填**，写清史书/演义边界、与哪些名场面互斥或可对读。  
- `participants`：可选；若写则同样须合法 npcId。

### 9.4 情感高潮的内置抑制（与 JSON 协同）

即使 JSON 未写，引擎也会在 **`shouldSuppressEmotionalBeat`** 中抑制情感高潮，例如：近两轮摘要含强冲突词、或摘要中**多名核心人物名同时出现**（拥挤群像）。配置 `ensembleBeats` 时勿假设「每轮都能插情感大戏」。

### 9.5 与 `historical-context` 的分工

- 史书/演义**能不能写、怎么写才不穿帮**：以 `historicalNotes` + `forbiddenEvents` + `optionalRomanceBeats.historicalNote` **三者一致**为准。  
- 「这一轮更像军议还是单挑」：以 `ensembleBeats` + 滚动摘要 suppress 为准。

---

## 10. `geography/locations.json` 与 `backstory.md`

### 10.1 地理 JSON

建议顶层 `{ "locations": [ ... ] }`，每项：

- `id`（slug）、`name`、`type`（战场/营帐/城楼等）、`description`、`connections`（其他 location id）、`rules`（人类可读玩法边界）、`npcs`（可出现于此处的 npcId）。

**要求**：描述中避免出现 `historical-context.location.forbiddenLocations` 中的禁地；`npcs` 宜为 `present` 或卡司子集。

### 10.2 `backstory.md`

- 供人读的长文；**引擎不加载**。  
- **须与** `historical-context`、`config` 开场、NPC 状态 **一致**（避免长文写「某人已死」而 JSON 仍 `alive` 等）。

---

## 11. 玩家身份（非剧本文件，但影响开局）

会话可带 `playerRoleProfile`（原创角色姓名背景 / 或扮演武将名）。开局 prompt 会注入 **【玩家角色信息】** 块（见 `buildPlayerRoleBlocks`）。  
剧本作者无需在 JSON 里重复该结构，但应在 `openingPlayerHint` 里考虑：**匿名旁观者 vs 已有身份** 皆能接上的空间描写。

---

## 12. 数值与叙事协同

- LLM 每轮 `stateChanges.hp`、`stateChanges.relationship` 为**增量**；引擎校验应用后 HP 与关系在合法区间。  
- 开局轮约定 **双零**（§3）。  
- 事件 JSON 中的数值供策划对齐，含义与上同。  
- 参考幅度（与导演块一致，非硬编码）：轻微 ±1～3；中等 ±3～10；重大 ±10～30；红线须叙事支撑。

---

## 13. 质量红线（不通过即返工）

1. `defaultTarget` 不在 `availableNpcs` 或无 `npcs` 文件。  
2. `availableNpcs` 与 `npcs` 目录不一致。  
3. `emotional-beats` 中 `participants` 引用非法 id。  
4. `dramaticRelationships` 与 `npcRoles` / `historicalNotes` **阵营或礼仪**矛盾。  
5. **hard** `forbiddenEvents` 需要告警却 **`keywords` 为空**。  
6. `absent` 默认禁止正名台词，却在节拍里要求其长篇前线独白且无豁免说明。  
7. `openingPlayerHint` 使用命令式代玩家操作。  
8. `backstory.md` 与 JSON 事实冲突。  
9. JSON 语法错误、注释、尾随逗号。

---

## 14. 交付物与自检清单

### 14.1 交付物

1. `scenarios/<scenarioId>/` 下全部约定文件。  
2. 简报：锚点、主冲突、卡司表、节拍设计、史书/演义策略、是否已注册 `scenario-narrative-hint`。  
3. 自检表（可复制 §14.2 结果）。

### 14.2 自检清单（建议打印给 Agent）

- [ ] `config`：`id`、`version`、`openingNarration`、`openingPlayerHint`、`availableNpcs`、`defaultTarget`、`npcRoles`（覆盖度检查）。  
- [ ] 每个 `availableNpcs` → `npcs/<id>.json` 存在且 `name` 正确。  
- [ ] `historical-context`：`period`、`location`、`present`/`absent`、`forbiddenEvents`、`historicalNotes`、`dramaticRelationships`、`relationships`、`addressRules`。  
- [ ] 所有需硬告警的 hard 事件含非空 `keywords`。  
- [ ] `ensembleBeats` / `optionalRomanceBeats` 的轮次与概率表可解释；`historicalNote` 无空项。  
- [ ] `geography`（若有）无禁地、npc 属于卡司或 present。  
- [ ] `backstory.md`（若有）与 JSON 无矛盾。  
- [ ] 卡司名单顺序：关键可点名角色不过度靠后（防 ensemble hint 截断）。  
- [ ] 新剧本若需专用「剧本类型」句：已计划修改 `scenario-narrative-hint.ts`。

---

## 15. 给另一 Agent 的任务模板（可直接粘贴）

```text
在仓库中新增或更新剧本目录：scenarios/<scenarioId>/。

A. 必备文件
- config.json（含 openingNarration、openingPlayerHint、availableNpcs、defaultTarget、npcRoles 全覆盖推荐）
- historical-context.json（含 dramaticRelationships；hard forbiddenEvents 带 keywords）
- npcs/*.json（与 availableNpcs 一一对应）
- events/*.json（至少 3 个，triggers 区分、effects 为增量）

B. 虎牢关级推荐
- emotional-beats.json（ensembleBeats + optionalRomanceBeats，historicalNote 完整）
- geography/locations.json
- backstory.md（与 JSON 一致）

C. 开局语义
- openingPlayerHint：空间锚点 + 感官 + 2～3 探索钩子；禁止命令式代操作；与 OPENING 轮「玩家尚未行动」一致。

D. 约束
- 不修改其他 scenario 目录（除非任务明确要求）
- 新剧本默认 narrative-hint 为「通用」；若需专用类型句，说明须改 scenario-narrative-hint.ts

交付：文件树、§14.2 自检勾选结果、硬禁 keywords 列表、卡司顺序截断风险评估（ensemble hint）、与 historical 的演义/史书口径说明。
```

---

## 16. 维护原则

**一致性优先于文采**；**可注入、可截断、可校验**优先于篇幅。轮次节拍与概率表一旦写上，即应对照 `scenario-emotional-hint.ts` 行为理解「强推荐 / 弱提示 / 抑制」，避免策划假设与引擎实现不一致。
