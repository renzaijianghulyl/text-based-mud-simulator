# 虎牢关剧本补充内容指南

**文档目的**：指导 AI 补充虎牢关剧本的人物关系、剧情事件、场景模板  
**最后更新**：2026-04-23  
**适用对象**：AI 助手（如 Cursor）

---

## 一、需要补充的内容清单

### **1.1 完善人物关系网（高优先级）**

**文件**：`scenarios/hulaguan/historical-context.json`  
**字段**：`dramaticRelationships`

**当前已有**：
- ✅ 曹操→袁绍（公开恭敬/私下保留）
- ✅ 袁绍→曹操（倚重且防）
- ✅ 曹操→孙坚（盟军同僚）

**需要补充**：

#### **袁绍的关系网**
```json
{
  "from": "yuan-shao",
  "to": "sun-jian",
  "public": {
    "tone": "盟主对部将，可嘉奖可调度",
    "note": "孙坚破华雄有功，袁绍既赏且忌（担心孙坚坐大）"
  },
  "private": {
    "tone": "内心忌惮孙坚勇烈，可写暗中制衡",
    "note": "为日后孙坚藏匿玉玺、袁绍追杀埋下伏笔"
  }
}
```

```json
{
  "from": "yuan-shao",
  "to": "gongsun-zan",
  "public": {
    "tone": "盟主对诸侯，表面客气",
    "note": "袁绍与公孙瓒已有嫌隙（后续界桥之战伏笔）"
  },
  "private": {
    "tone": "内心轻视公孙瓒出身低微",
    "note": "袁绍自视名门望族，看不起公孙瓒"
  }
}
```

```json
{
  "from": "yuan-shao",
  "to": "yuan-shu",
  "public": {
    "tone": "兄长对弟弟，表面和睦",
    "note": "袁绍是袁术兄长（异母），表面客气"
  },
  "private": {
    "tone": "内心嫌隙已深，为日后分裂伏笔",
    "note": "袁绍是庶出，袁术是嫡出，兄弟不和"
  }
}
```

#### **刘备的关系网**
```json
{
  "from": "liu-bei",
  "to": "gongsun-zan",
  "public": {
    "tone": "部下对上级，恭敬",
    "note": "刘备随公孙瓒出战，听其号令"
  },
  "private": {
    "tone": "内心有远大志向，但暂居人下",
    "note": "刘备胸怀大志，但此时势单力薄"
  }
}
```

```json
{
  "from": "liu-bei",
  "to": "cao-cao",
  "public": {
    "tone": "盟军同僚，互相尊重",
    "note": "刘备知曹操器重自己，但保持距离"
  },
  "private": {
    "tone": "内心警惕曹操，知其非池中物",
    "note": "刘备与曹操日后是对手，此时互相试探"
  }
}
```

#### **孙坚的关系网**
```json
{
  "from": "sun-jian",
  "to": "yuan-shao",
  "public": {
    "tone": "部将对盟主，不卑不亢",
    "note": "孙坚破华雄有功，对袁绍调度有保留"
  },
  "private": {
    "tone": "内心不满袁绍掣肘",
    "note": "孙坚认为袁绍优柔寡断，难成大事"
  }
}
```

#### **吕布的关系网**
```json
{
  "from": "lu-bu",
  "to": "dong-zhuo",
  "public": {
    "tone": "义子对义父，表面恭敬",
    "note": "吕布与董卓已有嫌隙（凤仪亭伏笔）"
  },
  "private": {
    "tone": "内心怨恨董卓控制，贪恋貂蝉",
    "note": "吕布与董卓因貂蝉生隙，日后反目"
  }
}
```

```json
{
  "from": "lu-bu",
  "to": "liu-bei",
  "public": {
    "tone": "轻视，称「大耳儿」",
    "note": "吕布看不起刘备出身低微"
  },
  "private": {
    "tone": "内心忌惮刘备得人心",
    "note": "吕布嫉妒刘备仁义得人心"
  }
}
```

---

### **1.2 增加关键剧情事件（高优先级）**

**文件**：`scenarios/hulaguan/emotional-beats.json`  
**字段**：`optionalRomanceBeats`

**当前已有**：
- ✅ 温酒斩华雄（演义，R15-R20）
- ✅ 三英战吕布（演义，R28-R35）

**需要补充**：

#### **孙坚破华雄（正史线）**
```json
{
  "name": "孙坚破华雄",
  "triggerRounds": [16, 18],
  "triggerProbability": 0.9,
  "layer": "historical_canon",
  "historicalNote": "正史《三国志·孙破虏传》：孙坚军破华雄，非关羽所斩。若触发此剧情，应写孙坚为破华雄主角。",
  "participants": ["sun-jian", "yuan-shao", "cao-cao"],
  "script": [
    {
      "speaker": "sun-jian",
      "line": "坚愿为先锋，明日必破华雄！",
      "action": "请战"
    },
    {
      "speaker": "yuan-shao",
      "line": "文台将军勇烈，本初敬佩。",
      "action": "嘉奖"
    },
    {
      "narration": "次日，孙坚军大破华雄，斩其首级。"
    }
  ]
}
```

#### **典韦救主（曹操嫡系高光）**
```json
{
  "name": "典韦救主",
  "triggerRounds": [25, 30],
  "triggerProbability": 0.7,
  "layer": "romance_optional",
  "historicalNote": "典韦勇救曹操，展现忠勇。为日后宛城之战典韦战死埋下伏笔。",
  "participants": ["cao-cao", "dian-wei", "lu-bu"],
  "script": [
    {
      "speaker": "lu-bu",
      "line": "曹操休走！某家来取汝首级！",
      "action": "突袭"
    },
    {
      "speaker": "dian-wei",
      "line": "主公莫慌，典韦在此！",
      "action": "护主"
    },
    {
      "narration": "典韦手持双戟，死战吕布，护曹操撤退。"
    }
  ]
}
```

#### **袁术 vs 袁绍（兄弟矛盾）**
```json
{
  "name": "袁术 vs 袁绍",
  "triggerRounds": [20, 28],
  "triggerProbability": 0.8,
  "layer": "historical_canon",
  "historicalNote": "袁术与袁绍兄弟不和，为日后分裂伏笔。",
  "participants": ["yuan-shao", "yuan-shu", "cao-cao"],
  "script": [
    {
      "speaker": "yuan-shu",
      "line": "兄长身为盟主，调度无方，致联军屡战不利！",
      "action": "质问"
    },
    {
      "speaker": "yuan-shao",
      "line": "公路慎言！为兄自有主张。",
      "action": "斥责"
    },
    {
      "speaker": "cao-cao",
      "line": "二位息怒，大敌当前，当以国事为重。",
      "action": "劝解"
    }
  ]
}
```

#### **刘备救孔融（仁义展现）**
```json
{
  "name": "刘备救孔融",
  "triggerRounds": [22, 26],
  "triggerProbability": 0.75,
  "layer": "romance_optional",
  "historicalNote": "刘备仁义，救孔融于危难，展现仁德。",
  "participants": ["liu-bei", "kong-rong", "guan-yu", "zhang-fei"],
  "script": [
    {
      "speaker": "kong-rong",
      "line": "北海被围，恳请玄德公相助！",
      "action": "求救"
    },
    {
      "speaker": "liu-bei",
      "line": "孔北海有难，备岂能坐视！云长、翼德，随我出征！",
      "action": "应允"
    },
    {
      "narration": "刘备率关张救孔融，仁义之名远播。"
    }
  ]
}
```

---

### **1.3 增加场景模板（中优先级）**

**文件**：`scenarios/hulaguan/emotional-beats.json`  
**字段**：`ensembleBeats`

**当前已有**：
- ✅ 军议（R8/R12/R18/R24/R32/R40）
- ✅ 阵前叫阵（R6/R14/R22/R30/R38）

**需要补充**：

#### **庆功宴**
```json
{
  "name": "庆功宴",
  "triggerRounds": [10, 20, 30, 40],
  "triggerCondition": "胜利后（如破华雄/退吕布）",
  "participants": ["yuan-shao", "cao-cao", "sun-jian", "liu-bei", "gongsun-zan"],
  "directorNote": "胜利后短暂欢庆，暗藏诸侯矛盾（袁术嫉妒孙坚、袁绍制衡曹操）",
  "suppressKeywords": ["战败", "撤退", "伤亡惨重"]
}
```

#### **败退**
```json
{
  "name": "败退",
  "triggerRounds": [15, 25, 35],
  "triggerCondition": "战败后（如被吕布击败）",
  "participants": ["cao-cao", "xiahou-dun", "dian-wei", "cao-ren"],
  "directorNote": "败退中展现忠勇（典韦护主、夏侯惇断后）",
  "suppressKeywords": ["庆功", "胜利", "大捷"]
}
```

#### **单挑**
```json
{
  "name": "单挑",
  "triggerRounds": [12, 22, 32],
  "participants": ["lv-bu", "guan-yu", "zhang-fei", "xiahou-dun", "dian-wei"],
  "directorNote": "武将对决，展现勇武（吕布战张飞/夏侯惇战吕布）",
  "suppressKeywords": ["军议", "群像"]
}
```

#### **夜袭**
```json
{
  "name": "夜袭",
  "triggerRounds": [18, 28, 38],
  "participants": ["cao-cao", "dian-wei", "lu-bu"],
  "directorNote": "偷袭敌营，展现智谋（曹操夜袭吕布营）",
  "suppressKeywords": ["军议", "庆功"]
}
```

---

### **1.4 增加 NPC 个人剧情线（选做）**

**文件**：`scenarios/hulaguan/npcs/*.json`  
**字段**：`personalArc`

**示例**：夏侯惇
```json
{
  "id": "xiahou-dun",
  "name": "夏侯惇",
  "styleName": "元让",
  "role": "曹操从弟部将，侧翼护卫与军务",
  "status": "active",
  "personality": "刚烈、忠勇、暴躁",
  "combatStyle": "近战猛将，擅长冲锋陷阵",
  "personalArc": {
    "currentGoal": "助曹操平定天下，保护主公安全",
    "futureForeshadowing": "拔矢啖睛（后续剧情伏笔：夏侯惇战吕布时眼睛中箭，拔矢啖睛继续战斗）",
    "relationshipGoals": [
      "保护曹操安全",
      "建立战功，证明自己的价值"
    ],
    "internalConflict": "担心自己能力不足，无法保护主公"
  }
}
```

**其他 NPC 伏笔**：
- **典韦**：护主战死（宛城之战）
- **赵云**：寻找明主（日后投奔刘备）
- **孙坚**：藏匿玉玺（被袁绍追杀）
- **关羽**：降汉不降曹（日后千里走单骑）

---

## 二、实施步骤

### **步骤 1：修改 historical-context.json**

```bash
# 打开文件
vim scenarios/hulaguan/historical-context.json

# 在 dramaticRelationships 数组中补充上述关系
# 注意保持 JSON 格式正确（逗号、引号）
```

### **步骤 2：修改 emotional-beats.json**

```bash
# 打开文件
vim scenarios/hulaguan/emotional-beats.json

# 在 optionalRomanceBeats 和 ensembleBeats 中补充上述内容
```

### **步骤 3：修改 NPC 个人剧情线（选做）**

```bash
# 打开 NPC 文件
vim scenarios/hulaguan/npcs/xiahou-dun.json

# 增加 personalArc 字段
```

### **步骤 4：测试验证**

```bash
# 运行测试
npm run test

# 人工测试
# 1. 军议场景是否出现多诸侯发言
# 2. 曹操 vs 袁绍关系是否准确（公开恭敬/私下保留）
# 3. 名场面是否触发（孙坚破华雄/典韦救主）
```

---

## 三、预期效果

### **3.1 人物关系更准确**

**优化前**：
- ❌ 曹操对袁绍过于轻蔑
- ❌ 缺少诸侯间互动

**优化后**：
- ✅ 曹操公开场合称"本初盟主"（恭敬）
- ✅ 袁绍对曹操"倚重且防"（复杂心态）
- ✅ 诸侯间有互动（袁术 vs 袁绍/孙坚 vs 袁绍）

### **3.2 剧情更精彩**

**优化前**：
- ❌ 只有温酒斩华雄/三英战吕布
- ❌ 场景单一（只有军议/阵前）

**优化后**：
- ✅ 增加孙坚破华雄（正史线）
- ✅ 增加典韦救主（曹操嫡系高光）
- ✅ 增加庆功宴/败退/单挑/夜袭场景

### **3.3 NPC 更立体**

**优化前**：
- ❌ NPC 扁平化（只有功能）

**优化后**：
- ✅ 夏侯惇：拔矢啖睛伏笔
- ✅ 典韦：护主战死伏笔
- ✅ 赵云：寻找明主伏笔

---

## 四、注意事项

### **4.1 JSON 格式**

```json
// ✅ 正确
{
  "key": "value",
  "array": [
    {"item": "1"},
    {"item": "2"}
  ]
}

// ❌ 错误（缺少逗号）
{
  "key": "value"
  "array": [...]
}
```

### **4.2 历史准确性**

- ✅ 正史事件标注 `layer: "historical_canon"`
- ✅ 演义事件标注 `layer: "romance_optional"`
- ✅ 增加 `historicalNote` 说明

### **4.3 触发概率**

- ✅ 重要事件：0.8-0.9（孙坚破华雄）
- ✅ 可选事件：0.7-0.75（典韦救主）
- ❌ 避免 1.0（太强制，失去自由度）

---

**文档结束**
