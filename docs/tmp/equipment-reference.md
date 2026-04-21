# 虎牢关 NPC 装备配置参考

**版本**: v1.0  
**创建日期**: 2026-04-16  
**用途**: 为 hulaguan 场景的所有 NPC 补充装备信息（武器、衣着、坐骑）  
**适用范围**: `/Users/liyulong/Desktop/Text-based MUD Simulator/scenarios/hulaguan/npcs/*.json`

---

## 一、配置规范

### 1.1 装备字段说明

在每个 NPC 的 JSON 配置中新增以下字段：

```json
{
  "equipment": ["武器名", "衣着名"],
  "mount": "坐骑名"
}
```

**字段说明**：
- `equipment`：数组，包含武器和衣着（2 个元素）
- `mount`：字符串，坐骑名称

### 1.2 配置原则

1. **武器**：每个 NPC 的标志性武器（如关羽=青龙偃月刀）
2. **衣着**：每个 NPC 的标志性服饰（如关羽=绿袍）
3. **坐骑**：每个 NPC 的坐骑（如吕布=赤兔马，其他人=普通战马）
4. **简洁**：只写名称，不写详细描述（描述交给 LLM 发挥）

---

## 二、NPC 装备配置（按历史/演义）

### 2.1 吕布（lv-bu）

**历史/演义依据**：
- 《三国演义》第五回：吕布"头戴三叉束发紫金冠，体挂西川红棉百花袍，身披兽面吞头连环铠，手持方天画戟，坐下嘶风赤兔马"
- "人中吕布，马中赤兔"

**配置**：
```json
{
  "equipment": ["方天画戟", "兽面吞头连环铠"],
  "mount": "赤兔马"
}
```

**说明**：
- 武器：方天画戟（吕布专属）
- 衣着：兽面吞头连环铠（吕布专属铠甲）
- 坐骑：赤兔马（吕布专属，后来曹操赐给关羽）

---

### 2.2 关羽（guan-yu）

**历史/演义依据**：
- 《三国演义》第五回：关羽"身长九尺，髯长二尺；丹凤眼，卧蚕眉；面如重枣，声如巨钟；手持青龙偃月刀，坐下普通战马"
- 关羽标志：绿袍（曹操所赐）、青龙刀

**配置**：
```json
{
  "equipment": ["青龙偃月刀", "绿袍"],
  "mount": "普通战马"
}
```

**说明**：
- 武器：青龙偃月刀（关羽专属）
- 衣着：绿袍（曹操赐给关羽，关羽穿在外面表示不忘旧主）
- 坐骑：普通战马（此时赤兔马还在吕布那里）

---

### 2.3 张飞（zhang-fei）

**历史/演义依据**：
- 《三国演义》第五回：张飞"身长八尺，豹头环眼，燕颔虎须，声若巨雷，势若奔马；手持丈八蛇矛，坐下黑色战马"
- 张飞标志：黑脸、丈八蛇矛、黑袍

**配置**：
```json
{
  "equipment": ["丈八蛇矛", "黑袍"],
  "mount": "普通战马"
}
```

**说明**：
- 武器：丈八蛇矛（张飞专属）
- 衣着：黑袍（张飞标志性的黑色服饰）
- 坐骑：普通战马（黑色）

---

### 2.4 刘备（liu-bei）

**历史/演义依据**：
- 《三国演义》第五回：刘备"身长七尺五寸，两耳垂肩，双手过膝；手持双股剑，坐下普通战马"
- 刘备标志：双股剑、仁德

**配置**：
```json
{
  "equipment": ["双股剑", "仁德袍"],
  "mount": "普通战马"
}
```

**说明**：
- 武器：双股剑（刘备专属，一雌一雄）
- 衣着：仁德袍（象征刘备的仁德）
- 坐骑：普通战马

---

### 2.5 曹操（cao-cao）

**历史/演义依据**：
- 《三国演义》第五回：曹操"身长七尺，细眼长髯；手持倚天剑，穿红袍，坐下普通战马"
- 曹操标志：倚天剑、红袍、奸雄

**配置**：
```json
{
  "equipment": ["倚天剑", "红袍"],
  "mount": "普通战马"
}
```

**说明**：
- 武器：倚天剑（曹操专属，后来传给曹丕）
- 衣着：红袍（曹操标志性的红色服饰）
- 坐骑：普通战马

---

### 2.6 董卓（dong-zhuo）

**历史/演义依据**：
- 《三国演义》第五回：董卓"肥胖无比，手持大刀，穿华丽锦袍，坐下肥胖战马"
- 董卓标志：肥胖、专权、锦袍

**配置**：
```json
{
  "equipment": ["大刀", "锦袍"],
  "mount": "肥胖战马"
}
```

**说明**：
- 武器：大刀（董卓的武器）
- 衣着：锦袍（象征董卓的奢华）
- 坐骑：肥胖战马（符合董卓的体型）

---

### 2.7 袁绍（yuan-shao）

**历史/演义依据**：
- 《三国演义》第五回：袁绍"出身名门，手持长剑，穿华丽铠甲，坐下高头大马"
- 袁绍标志：名门之后、盟主、优柔寡断

**配置**：
```json
{
  "equipment": ["长剑", "华丽铠甲"],
  "mount": "高头大马"
}
```

**说明**：
- 武器：长剑（袁绍的武器）
- 衣着：华丽铠甲（象征袁绍的名门出身）
- 坐骑：高头大马（符合袁绍的贵族气质）

---

## 三、完整 JSON 配置示例

### 3.1 吕布（lv-bu.json）

```json
{
  "id": "lv-bu",
  "name": "吕布",
  "title": "飞将",
  "personality": "高傲、易怒、但爱才",
  "motivation": "证明自己是天下第一猛将",
  "speakingStyle": "简短、直接、自称\"某家\"",
  "equipment": ["方天画戟", "兽面吞头连环铠"],
  "mount": "赤兔马",
  "relationships": {
    "dong-zhuo": { "initial": 60, "label": "义父子" },
    "zhang-fei": { "initial": -80, "label": "死敌" },
    "liu-bei": { "initial": 0, "label": "陌生" },
    "guan-yu": { "initial": 0, "label": "陌生" },
    "hua-xiong": { "initial": 50, "label": "同僚" }
  },
  "redLines": [
    "被骂\"三姓家奴\"",
    "被刺杀",
    "被背叛",
    "被说怕死"
  ]
}
```

---

### 3.2 关羽（guan-yu.json）

```json
{
  "id": "guan-yu",
  "name": "关羽",
  "title": "关云长",
  "personality": "忠义、骄傲、武艺高强",
  "motivation": "跟随大哥刘备，匡扶汉室",
  "speakingStyle": "威严、自称\"关某\"",
  "equipment": ["青龙偃月刀", "绿袍"],
  "mount": "普通战马",
  "relationships": {
    "lv-bu": { "initial": 0, "label": "陌生" },
    "liu-bei": { "initial": 100, "label": "大哥" },
    "zhang-fei": { "initial": 100, "label": "三弟" },
    "hua-xiong": { "initial": -100, "label": "手下败将（已斩）" }
  },
  "redLines": ["被侮辱", "大哥被骂", "被说胆小"]
}
```

---

### 3.3 张飞（zhang-fei.json）

```json
{
  "id": "zhang-fei",
  "name": "张飞",
  "title": "翼德",
  "personality": "暴躁、直率、重义气",
  "motivation": "跟随大哥刘备，匡扶汉室",
  "speakingStyle": "粗犷、自称\"俺\"",
  "equipment": ["丈八蛇矛", "黑袍"],
  "mount": "普通战马",
  "relationships": {
    "lv-bu": { "initial": -80, "label": "死敌" },
    "liu-bei": { "initial": 100, "label": "大哥" },
    "guan-yu": { "initial": 100, "label": "二哥" }
  },
  "redLines": ["被说胆小", "大哥被侮辱", "被说无能"]
}
```

---

### 3.4 刘备（liu-bei.json）

```json
{
  "id": "liu-bei",
  "name": "刘备",
  "title": "玄德",
  "personality": "仁德、宽厚、善于用人",
  "motivation": "匡扶汉室，拯救百姓",
  "speakingStyle": "温和、自称\"备\"",
  "equipment": ["双股剑", "仁德袍"],
  "mount": "普通战马",
  "relationships": {
    "guan-yu": { "initial": 100, "label": "二弟" },
    "zhang-fei": { "initial": 100, "label": "三弟" },
    "cao-cao": { "initial": 0, "label": "陌生" }
  },
  "redLines": ["百姓被伤害", "兄弟被侮辱"]
}
```

---

### 3.5 曹操（cao-cao.json）

```json
{
  "id": "cao-cao",
  "name": "曹操",
  "title": "孟德",
  "personality": "多疑、爱才、有谋略",
  "motivation": "讨伐董卓，成就大业",
  "speakingStyle": "深沉、自称\"操\"",
  "equipment": ["倚天剑", "红袍"],
  "mount": "普通战马",
  "relationships": {
    "lv-bu": { "initial": 0, "label": "陌生" },
    "liu-bei": { "initial": 20, "label": "盟友" },
    "dong-zhuo": { "initial": -100, "label": "死敌" },
    "yuan-shao": { "initial": 10, "label": "盟主" },
    "guan-yu": { "initial": 50, "label": "欣赏" },
    "zhang-fei": { "initial": 30, "label": "欣赏" }
  },
  "redLines": ["被说汉贼", "被背叛", "被威胁"]
}
```

---

### 3.6 董卓（dong-zhuo.json）

```json
{
  "id": "dong-zhuo",
  "name": "董卓",
  "title": "仲颖",
  "personality": "残暴、专权、肥胖",
  "motivation": "掌控朝政，独揽大权",
  "speakingStyle": "霸道、自称\"咱家\"",
  "equipment": ["大刀", "锦袍"],
  "mount": "肥胖战马",
  "relationships": {
    "lv-bu": { "initial": 60, "label": "义父子" },
    "yuan-shao": { "initial": -100, "label": "敌人" }
  },
  "redLines": ["被威胁", "被背叛", "被说肥胖"]
}
```

---

### 3.7 袁绍（yuan-shao.json）

```json
{
  "id": "yuan-shao",
  "name": "袁绍",
  "title": "本初",
  "personality": "名门之后、优柔寡断、爱面子",
  "motivation": "讨伐董卓，成为盟主",
  "speakingStyle": "高傲、自称\"本初\"",
  "equipment": ["长剑", "华丽铠甲"],
  "mount": "高头大马",
  "relationships": {
    "cao-cao": { "initial": 10, "label": "盟友" },
    "dong-zhuo": { "initial": -100, "label": "敌人" },
    "yuan-shu": { "initial": 50, "label": "堂弟" }
  },
  "redLines": ["被说无能", "被轻视", "盟主权威被挑战"]
}
```

---

## 四、实施步骤

### 4.1 修改类型定义

**文件**：`/Users/liyulong/Desktop/Text-based MUD Simulator/src/types.ts`

**修改**（CurrentNpc 接口）：
```typescript
export interface CurrentNpc {
  id: string;
  name: string;
  title?: string;              // ← 新增（可选）
  personality: string;
  motivation: string;
  speakingStyle?: string;      // ← 新增（可选）
  equipment?: string[];        // ← 新增（专属装备）
  mount?: string;              // ← 新增（坐骑）
  redLines?: string[];
  relationship: number;
}
```

---

### 4.2 修改 NPC JSON 配置

**文件**：`/Users/liyulong/Desktop/Text-based MUD Simulator/scenarios/hulaguan/npcs/*.json`

为每个 NPC 添加 `equipment` 和 `mount` 字段（参考第三部分的完整示例）。

---

### 4.3 修改 Prompt 注入逻辑

**文件**：`/Users/liyulong/Desktop/Text-based MUD Simulator/src/engine/prompt-builder.ts`

**修改位置**：第 119-122 行（npcBlock 生成）

**当前代码**：
```typescript
const npcBlock = clip(
  `${npc.name}：性格「${npc.personality}」`,
  BUDGET_NPC
);
```

**优化后代码**：
```typescript
// 构建装备描述（如果有）
const npcEquipment: string[] = [];
if (npc.equipment && npc.equipment.length > 0) {
  npcEquipment.push(npc.equipment.join('、'));
}
if (npc.mount) {
  npcEquipment.push(`坐骑「${npc.mount}」`);
}
const equipmentStr = npcEquipment.length > 0 ? `，装备「${npcEquipment.join('、')}」` : '';

const npcBlock = clip(
  `${npc.name}${npc.title ? '（${npc.title}）' : ''}：性格「${npc.personality}」${equipmentStr}`,
  BUDGET_NPC
);
```

**生成效果示例**：
- 关羽：`关羽（关云长）：性格「忠义、骄傲、武艺高强」，装备「青龙偃月刀、绿袍、坐骑「普通战马」」`
- 吕布：`吕布（飞将）：性格「高傲、易怒、但爱才」，装备「方天画戟、兽面吞头连环铠、坐骑「赤兔马」」`

---

## 五、验证清单

优化完成后，验证以下要点：

- [ ] 所有 7 个 NPC 都有 `equipment` 和 `mount` 字段
- [ ] 吕布的坐骑是"赤兔马"（唯一专属）
- [ ] 其他 NPC 的坐骑是"普通战马"（或变体如"肥胖战马"、"高头大马"）
- [ ] 关羽的武器是"青龙偃月刀"（不是方天画戟）
- [ ] 吕布的武器是"方天画戟"（不是青龙偃月刀）
- [ ] Prompt 注入后显示装备信息
- [ ] 运行测试，LLM 不再张冠李戴

---

## 六、历史依据说明

**主要参考**：
- 《三国演义》（罗贯中著）第五回"发矫诏诸镇应曹公 破关兵三英战吕布"
- 《三国志》（陈寿著）相关列传

**关键装备考证**：
1. **赤兔马**：吕布专属→曹操→关羽（《三国演义》第三回、第二十回）
2. **青龙偃月刀**：关羽专属（《三国演义》第一回）
3. **方天画戟**：吕布专属（《三国演义》第五回）
4. **丈八蛇矛**：张飞专属（《三国演义》第一回）
5. **双股剑**：刘备专属（《三国演义》第一回）
6. **倚天剑**：曹操专属（《三国演义》第四十一回）
7. **绿袍**：曹操赐关羽（《三国演义》第二十回）
8. **红袍**：曹操标志性服饰（《三国演义》第五回）

---

**文档结束**

**创建者**: Eden（Ed）  
**创建日期**: 2026-04-16  
**用途**: 指导 Cursor 为 hulaguan 场景的所有 NPC 补充装备配置
