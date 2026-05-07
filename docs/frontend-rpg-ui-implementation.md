# 前端 RPG 风格对话 UI 实施方案

**方案编号**: 方案 3（前端解析对话）  
**优先级**: P0（立即执行）  
**预计工作量**: 4-6 小时  
**叙事效果影响**: ✅ **无影响**

---

## 📋 方案概述

### **核心思路**

不修改 LLM 输出格式，前端解析对话字符串，提取 NPC 名字和对话内容，实现 RPG 风格展示。

### **目标效果**

```
┌─────────────────────────────────────────────┐
│  【旁白区域 - 灰色文字，居中，无头像】       │
│  虎牢关前，晨风卷着黄沙扑面而来...          │
└─────────────────────────────────────────────┘

┌──────────────┐  ┌──────────────────────────┐
│ [你的头像]   │  │ 你：                      │
│              │  │ "吕布休要猖狂！"          │
│              │  └──────────────────────────┘
└──────────────┘

┌──────────────┐  ┌──────────────────────────┐
│ [吕布头像]   │  │ 吕布：                    │
│              │  │ "哼！无名鼠辈！"          │
│              │  └──────────────────────────┘
└──────────────┘
```

---

## 🔧 实施步骤

### **步骤 1：修改 Msg 类型定义**

**文件**: `src/frontend/src/store/useGameStore.ts`

**当前代码**（第 3 行）：
```typescript
export type Msg = { role: 'user' | 'narration' | 'dialogue'; text: string };
```

**修改后**：
```typescript
// 增加 speaker 字段（仅 dialogue 需要）
export type Msg = 
  | { role: 'user'; text: string }
  | { role: 'narration'; text: string }
  | { role: 'dialogue'; text: string; speaker: string };
```

---

### **步骤 2：创建对话解析工具函数**

**文件**: `src/frontend/src/utils/parseDialogues.ts`（新建）

**代码**：
```typescript
import type { Msg } from '../store/useGameStore';

/**
 * 解析对话字符串，提取多轮对话
 * 
 * @param dialogueText LLM 返回的对话字符串（可能包含多行）
 * @param npcName 当前 NPC 名字（如"吕布"）
 * @returns 解析后的消息数组
 * 
 * 示例输入：
 * dialogueText = "吕布：哼！无名鼠辈！\n你：吕布休要猖狂！\n吕布：受死吧！"
 * npcName = "吕布"
 * 
 * 示例输出：
 * [
 *   { role: 'dialogue', text: '哼！无名鼠辈！', speaker: '吕布' },
 *   { role: 'user', text: '吕布休要猖狂！' },
 *   { role: 'dialogue', text: '受死吧！', speaker: '吕布' }
 * ]
 */
export function parseDialogues(
  dialogueText: string,
  npcName: string
): Msg[] {
  try {
    const messages: Msg[] = [];
    const lines = dialogueText.split('\n');
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) continue; // 跳过空行
      
      // 识别 NPC 对话
      if (trimmedLine.startsWith(`${npcName}：`)) {
        messages.push({
          role: 'dialogue',
          text: trimmedLine.replace(`${npcName}：`, ''),
          speaker: npcName,
        });
      } 
      // 识别用户对话
      else if (trimmedLine.startsWith('你：')) {
        messages.push({
          role: 'user',
          text: trimmedLine.replace('你：', ''),
        });
      }
      // 其他格式（降级处理，当作 NPC 对话）
      else {
        messages.push({
          role: 'dialogue',
          text: trimmedLine,
          speaker: npcName,
        });
      }
    }
    
    // 如果解析出多条，返回解析结果
    if (messages.length > 1) {
      console.log('[parseDialogues] 成功解析多轮对话', messages);
      return messages;
    }
    
    // 否则返回原始（降级到方案 1）
    console.log('[parseDialogues] 单轮对话，使用原始格式');
    return [{ role: 'dialogue', text: dialogueText, speaker: npcName }];
  } catch (e) {
    // 解析失败，降级到方案 1
    console.warn('[parseDialogues] 解析失败，使用原始格式', e);
    return [{ role: 'dialogue', text: dialogueText, speaker: npcName }];
  }
}
```

---

### **步骤 3：修改 applyInteractSuccess 使用解析函数**

**文件**: `src/frontend/src/store/useGameStore.ts`

**当前代码**（第 50-52 行）：
```typescript
if (typeof r.dialogue === 'string' && r.dialogue.length > 0) {
  messages = [...messages, { role: 'dialogue', text: r.dialogue }];
}
```

**修改后**：
```typescript
import { parseDialogues } from '../utils/parseDialogues';

// ... 在第 50-52 行修改
if (typeof r.dialogue === 'string' && r.dialogue.length > 0) {
  // 使用解析函数提取多轮对话
  const speaker = st?.npcs?.current?.name ?? npcName;
  const parsed = parseDialogues(r.dialogue, speaker);
  messages = [...messages, ...parsed];
}
```

**完整修改后的 applyInteractSuccess**：
```typescript
applyInteractSuccess: (text, r) =>
  set((s) => {
    let messages = s.messages;
    
    // 添加用户输入
    if (text.trim()) {
      messages = [...messages, { role: 'user' as const, text }];
    }
    
    // 添加旁白
    if (typeof r.narration === 'string' && r.narration.length > 0) {
      messages = [...messages, { role: 'narration', text: r.narration }];
    }
    
    // 添加对话（使用解析函数）
    if (typeof r.dialogue === 'string' && r.dialogue.length > 0) {
      const st = r.state as Record<string, unknown> | undefined;
      const speaker = st?.npcs?.current?.name ?? s.npcName;
      const parsed = parseDialogues(r.dialogue, speaker);
      messages = [...messages, ...parsed];
    }
    
    // 更新状态
    const st = r.state as Record<string, unknown> | undefined;
    let hp = s.hp;
    let maxHp = s.maxHp;
    let npcName = s.npcName;
    let rel = s.rel;
    let round = s.round;
    
    if (st?.player) {
      const p = st.player as { hp: number; maxHp: number };
      hp = p.hp;
      maxHp = p.maxHp;
    }
    if (st?.npcs) {
      const cur = (st.npcs as { current: { name: string; relationship: number } }).current;
      npcName = cur.name;
      rel = cur.relationship;
    }
    if (st?.currentRound !== undefined) {
      round = Number(st.currentRound);
    }
    
    return { messages, intent: '', hp, maxHp, npcName, rel, round };
  }),
```

---

### **步骤 4：修改 UI 展示（RPG 风格）**

**文件**: `src/frontend/src/pages/stage/stage.tsx`

**当前代码**（第 93-96 行）：
```typescript
{messages.map((msg, i) => (
  <View key={i} className={`st__msg st__msg--${msg.role}`}>
    <Text>{msg.text}</Text>
  </View>
))}
```

**修改后**：
```typescript
{messages.map((msg, i) => {
  // 旁白：居中展示，无头像
  if (msg.role === 'narration') {
    return (
      <View key={i} className="st__msg st__msg--narration">
        <Text className="st__msgText--narration">{msg.text}</Text>
      </View>
    );
  }
  
  // 对话：展示头像 + 气泡
  if (msg.role === 'dialogue' || msg.role === 'user') {
    const isUser = msg.role === 'user';
    const speaker = isUser ? '你' : (msg as any).speaker || 'NPC';
    const avatarSrc = isUser 
      ? '/assets/avatars/user.png' 
      : `/assets/avatars/${speaker}.png`;
    
    return (
      <View key={i} className={`st__msg st__msg--dialogue ${isUser ? 'st__msg--user' : 'st__msg--npc'}`}>
        {/* 用户对话：头像在右 */}
        {isUser && (
          <>
            <View className="st__bubble st__bubble--user">
              <Text className="st__speaker">你：</Text>
              <Text>{msg.text}</Text>
            </View>
            <Image className="st__avatar" src={avatarSrc} mode="aspectFill" />
          </>
        )}
        
        {/* NPC 对话：头像在左 */}
        {!isUser && (
          <>
            <Image className="st__avatar" src={avatarSrc} mode="aspectFill" />
            <View className="st__bubble">
              <Text className="st__speaker">{speaker}：</Text>
              <Text>{msg.text}</Text>
            </View>
          </>
        )}
      </View>
    );
  }
  
  return null;
})}
```

---

### **步骤 5：添加样式文件**

**文件**: `src/frontend/src/pages/stage/stage.scss`

**新增样式**：
```scss
.st {
  display: flex;
  flex-direction: column;
  height: 100vh;
  
  &__msg {
    display: flex;
    align-items: flex-start;
    margin: 16rpx;
    
    // 旁白：居中，灰色文字
    &--narration {
      justify-content: center;
      margin: 24rpx 0;
      
      .st__msgText--narration {
        color: #999;
        font-size: 28rpx;
        text-align: center;
        line-height: 1.6;
        padding: 0 32rpx;
      }
    }
    
    // 对话：头像 + 气泡
    &--dialogue {
      align-items: flex-start;
      
      // NPC 对话（头像在左）
      &.st__msg--npc {
        flex-direction: row;
        
        .st__avatar {
          margin-right: 16rpx;
        }
        
        .st__bubble {
          background-color: #fff;
          border-radius: 16rpx;
          padding: 16rpx 24rpx;
          max-width: 70%;
          
          .st__speaker {
            display: block;
            color: #666;
            font-size: 24rpx;
            margin-bottom: 8rpx;
          }
        }
      }
      
      // 用户对话（头像在右）
      &.st__msg--user {
        flex-direction: row-reverse;
        
        .st__avatar {
          margin-left: 16rpx;
        }
        
        .st__bubble--user {
          background-color: #95ec69; // 微信绿色
          border-radius: 16rpx;
          padding: 16rpx 24rpx;
          max-width: 70%;
          
          .st__speaker {
            display: block;
            color: #07c160;
            font-size: 24rpx;
            margin-bottom: 8rpx;
          }
        }
      }
    }
  }
  
  &__avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background-color: #f0f0f0;
    flex-shrink: 0;
  }
  
  &__bubble {
    box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
  }
  
  &__speaker {
    font-weight: 600;
  }
  
  // 其他现有样式保留...
}
```

---

### **步骤 6：准备头像资源**

**目录**: `src/frontend/src/assets/avatars/`

**需要的头像**：
```
avatars/
  ├── user.png          # 玩家默认头像
  ├── lv-bu.png         # 吕布头像
  ├── cao-cao.png       # 曹操头像
  ├── guan-yu.png       # 关羽头像
  ├── zhang-fei.png     # 张飞头像
  └── default.png       # 默认 NPC 头像（降级用）
```

**头像规格**：
- 尺寸：200x200px（@2x: 400x400px）
- 格式：PNG（透明背景）
- 风格：三国风格（建议统一风格）

**临时方案**（如果没有头像）：
```scss
.st__avatar {
  // 用文字头像临时替代
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f0f0f0;
  color: #666;
  font-size: 32rpx;
  font-weight: bold;
}
```

---

## ✅ 验收标准

### **功能验收**

- [ ] 旁白居中展示（灰色文字，无头像）
- [ ] NPC 对话展示头像 + 气泡（头像在左）
- [ ] 用户对话展示头像 + 气泡（头像在右）
- [ ] 多轮对话正确解析（按换行分割）
- [ ] 解析失败时降级展示（不崩溃）

### **视觉验收**

- [ ] 头像尺寸统一（80x80rpx）
- [ ] 气泡样式美观（圆角、阴影）
- [ ] 角色名显示（"吕布："、"你："）
- [ ] 颜色区分（NPC 白色气泡，用户绿色气泡）

### **性能验收**

- [ ] 解析函数执行时间 < 10ms
- [ ] 100 条消息渲染时间 < 500ms
- [ ] 无内存泄漏（切换场景后清理）

---

## 🐛 降级处理

### **场景 1：解析失败**

```typescript
// parseDialogues 中已处理
catch (e) {
  console.warn('[parseDialogues] 解析失败，使用原始格式', e);
  return [{ role: 'dialogue', text: dialogueText, speaker: npcName }];
}
```

**效果**：降级到聊天风格（无头像，纯文本）

---

### **场景 2：头像加载失败**

```scss
// SCSS 中添加
.st__avatar {
  // 加载失败时显示文字
  &::after {
    content: attr(data-fallback);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }
}
```

**效果**：显示 NPC 名字首字（如"吕"）

---

### **场景 3：多 NPC 对话**

```typescript
// 如果 LLM 返回"吕布：... 曹操：..."
// 当前解析逻辑会识别为 NPC 对话（用当前 NPC 名字）
// 后续可以扩展支持多 NPC 识别
```

**效果**：统一用当前 NPC 名字（可接受）

---

## 📝 测试用例

### **测试 1：单轮对话**

**输入**：
```
dialogueText = "吕布：哼！无名鼠辈！"
npcName = "吕布"
```

**预期输出**：
```typescript
[
  { role: 'dialogue', text: '哼！无名鼠辈！', speaker: '吕布' }
]
```

---

### **测试 2：多轮对话**

**输入**：
```
dialogueText = "吕布：哼！无名鼠辈！\n你：吕布休要猖狂！\n吕布：受死吧！"
npcName = "吕布"
```

**预期输出**：
```typescript
[
  { role: 'dialogue', text: '哼！无名鼠辈！', speaker: '吕布' },
  { role: 'user', text: '吕布休要猖狂！' },
  { role: 'dialogue', text: '受死吧！', speaker: '吕布' }
]
```

---

### **测试 3：解析失败降级**

**输入**：
```
dialogueText = "吕布冷哼一声，没有说话"
npcName = "吕布"
```

**预期输出**：
```typescript
[
  { role: 'dialogue', text: '吕布冷哼一声，没有说话', speaker: '吕布' }
]
```

---

## 🎯 后续优化（P1 优先级）

### **优化 1：打字机效果**

```typescript
// 逐字展示对话
const [displayedText, setDisplayedText] = useState('');

useEffect(() => {
  let index = 0;
  const timer = setInterval(() => {
    setDisplayedText(msg.text.slice(0, index));
    index++;
    if (index > msg.text.length) clearInterval(timer);
  }, 50); // 每 50ms 显示一个字
  
  return () => clearInterval(timer);
}, [msg.text]);
```

---

### **优化 2：头像资源优化**

```typescript
// 使用云函数动态生成头像
// 或用 Canvas 绘制文字头像
const generateAvatar = (name: string) => {
  // 根据名字生成彩色文字头像
  const colors = ['#f56c6c', '#e6a23c', '#50bfff', '#67c23a'];
  const color = colors[name.length % colors.length];
  const initial = name[0];
  
  return `data:image/svg+xml;utf8,<svg>...</svg>`;
};
```

---

### **优化 3：多 NPC 识别增强**

```typescript
// 识别对话中的任意 NPC 名字
const NPC_NAMES = ['吕布', '曹操', '关羽', '张飞', '刘备', '董卓'];

export function parseDialogues(dialogueText: string, npcName: string): Msg[] {
  // ... 现有逻辑
  
  // 扩展：识别其他 NPC 名字
  for (const name of NPC_NAMES) {
    if (line.startsWith(`${name}：`)) {
      messages.push({
        role: 'dialogue',
        text: line.replace(`${name}：`, ''),
        speaker: name,
      });
    }
  }
}
```

---

## 📋 实施清单

- [ ] **步骤 1**：修改 Msg 类型定义（useGameStore.ts）
- [ ] **步骤 2**：创建 parseDialogues 工具函数（utils/parseDialogues.ts）
- [ ] **步骤 3**：修改 applyInteractSuccess 使用解析函数
- [ ] **步骤 4**：修改 UI 展示（stage.tsx）
- [ ] **步骤 5**：添加样式文件（stage.scss）
- [ ] **步骤 6**：准备头像资源（assets/avatars/）
- [ ] **测试**：单轮对话、多轮对话、降级处理
- [ ] **验收**：功能、视觉、性能

---

**文档生成时间**: 2026-04-21 17:05  
**方案编号**: 方案 3（前端解析对话）  
**叙事效果影响**: ✅ **无影响**

---

🦞✨
