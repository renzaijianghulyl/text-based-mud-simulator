/**
 * 跨模块共享类型（会话、解析结果、状态增量等）
 */

/** 单卡司 HP 增量（相对本会话副本当前值）；仅模型显式输出时合并 */
export interface NpcHpDelta {
  id: string;
  delta: number;
}

export interface StateChanges {
  hp: number;
  relationship: number;
  reason?: string;
  /** 本局已退场卡司 id（剧本 npc id），仅当模型显式输出时合并；解析侧不捏造 */
  eliminatedNpcs?: string[];
  /** 卡司 HP 增量；id 为剧本 npc id；仅模型显式输出时合并 */
  npcHp?: NpcHpDelta[];
}

export type StorySceneType = 'narration' | 'action' | 'dialogue';

export interface StoryScene {
  type: StorySceneType;
  content: string;
  speaker?: string;
  durationMs?: number;
}

export interface ParseResult {
  narration: string;
  dialogue: string;
  stateChanges: StateChanges;
  scenes?: StoryScene[];
}

export interface KeyEvent {
  round: number;
  event: string;
  impact: string;
}

export interface NarrativeEnvironment {
  time?: string;
  weather?: string;
  location?: string;
}

export interface RecentPhrase {
  phrase: string;
  round: number;
}

export interface CumulativeState {
  totalRounds: number;
  hp: number;
  maxHp: number;
  status?: string;
  endings?: string[];
  environment?: NarrativeEnvironment;
}

export interface SessionPlayer {
  hp: number;
  maxHp: number;
  name?: string;
}

export type PlayerRoleMode = 'oc' | 'general';

export interface OriginalCharacterProfile {
  mode: 'oc';
  name: string;
  background: string;
}

export interface GeneralRoleProfile {
  mode: 'general';
  generalName: string;
}

export type PlayerRoleProfile = OriginalCharacterProfile | GeneralRoleProfile;

export interface CurrentNpc {
  id: string;
  name: string;
  title?: string;
  personality: string;
  motivation: string;
  speakingStyle?: string;
  /** 武器与衣着等，与剧本包 npc JSON 对齐 */
  equipment?: string[];
  mount?: string;
  redLines?: string[];
  relationship: number;
}

export interface SessionNpcsContext {
  current: CurrentNpc;
}

/** 本会话卡司战斗状态副本（不入只读剧本包；由引擎按剧本初始化并可被 stateChanges.npcHp 更新） */
export interface NpcCombatState {
  hp: number;
  maxHp: number;
}

export interface HistoryEntry {
  round: number;
  intent: string;
  narration: string;
  dialogue: string;
  changes: StateChanges;
  timestamp: string;
}

export interface Session {
  _id: string;
  sessionId: string;
  userId: string;
  scenarioId: string;
  npcs: SessionNpcsContext;
  relationships: Record<string, number>;
  player: SessionPlayer;
  /** 玩家身份：原创角色（姓名+背景）或扮演武将（武将名） */
  playerRoleProfile?: PlayerRoleProfile;
  /** 最近至多 3 条滚动摘要（每轮一条） */
  recentSummaryLines: string[];
  /** 最近表达窗口（用于提示词避重） */
  recentPhrases: RecentPhrase[];
  keyEvents: KeyEvent[];
  cumulativeState: CumulativeState;
  history: HistoryEntry[];
  /** 当前轮次（写入摘要时使用，处理结束后递增） */
  currentRound: number;
  /** 本会话允许的「玩家输入框发送」成功次数上限（初始 10 + 分享奖励） */
  intentQuotaGranted: number;
  /** 已成功消费的意图次数（不含新开剧本自动开局旁白） */
  intentQuotaConsumed: number;
  /** 本局已领取的分享加次数次数（用于上限） */
  intentQuotaShareClaims: number;
  /** 本局叙事中已退场/阵亡的卡司 id（剧本 npc id），用于 prompt 与群像过滤 */
  eliminatedNpcIds?: string[];
  /** 卡司 HP 本会话副本：key 为剧本 npc id */
  npcCombatById?: Record<string, NpcCombatState>;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessResult {
  narration: string;
  dialogue: string;
  changes: StateChanges;
  scenes?: StoryScene[];
  state: Session;
}
