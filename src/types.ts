/**
 * 跨模块共享类型（会话、解析结果、状态增量等）
 */

export interface StateChanges {
  hp: number;
  relationship: number;
  reason?: string;
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
