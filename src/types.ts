/**
 * 跨模块共享类型（会话、解析结果、状态增量等）
 */

export interface StateChanges {
  hp: number;
  relationship: number;
  reason?: string;
}

export interface ParseResult {
  narration: string;
  dialogue: string;
  stateChanges: StateChanges;
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
  /** 最近至多 3 条滚动摘要（每轮一条） */
  recentSummaryLines: string[];
  /** 最近表达窗口（用于提示词避重） */
  recentPhrases: RecentPhrase[];
  keyEvents: KeyEvent[];
  cumulativeState: CumulativeState;
  history: HistoryEntry[];
  /** 当前轮次（写入摘要时使用，处理结束后递增） */
  currentRound: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProcessResult {
  narration: string;
  dialogue: string;
  changes: StateChanges;
  state: Session;
}
