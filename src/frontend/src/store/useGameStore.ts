import { create } from 'zustand';
import type { PlayerRoleProfile } from '../types/player-role';
import { readIntentQuotaFromState } from '../utils/intent-quota-client';

export type StoryScene = {
  type: 'narration' | 'action' | 'dialogue';
  content: string;
  speaker?: string;
  durationMs?: number;
};

export type GameStore = {
  scenarioId: string;
  intent: string;
  scenes: StoryScene[];
  currentSceneIndex: number;
  playing: boolean;
  loading: boolean;
  hp: number;
  maxHp: number;
  rel: number;
  round: number;
  npcName: string;
  /** 新开剧本时暂存，供 stage 首跳 isNew 传给云函数 */
  pendingPlayerRoleProfile: PlayerRoleProfile | null;
  /** 顶栏展示：从云函数 state.playerRoleProfile 同步 */
  playerRoleLabel: string;
  intentQuotaGranted: number;
  intentQuotaConsumed: number;
  intentQuotaRemaining: number;
  setScenarioId: (v: string) => void;
  setIntent: (v: string) => void;
  setLoading: (v: boolean) => void;
  setPendingPlayerRoleProfile: (v: PlayerRoleProfile | null) => void;
  clearPendingPlayerRoleProfile: () => void;
  resetScenes: () => void;
  nextScene: () => void;
  replayScenesFromStart: () => void;
  applyInteractSuccess: (text: string, r: Record<string, unknown>) => void;
  /** 仅同步云 state（HP/关系/轮次/配额等），不改写分镜列表 */
  applyCloudStateOnly: (st: Record<string, unknown>) => void;
};

function asScene(raw: unknown): StoryScene | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null;
  const row = raw as Record<string, unknown>;
  const type = row.type;
  const content = row.content;
  if ((type !== 'narration' && type !== 'action' && type !== 'dialogue') || typeof content !== 'string') {
    return null;
  }
  const speaker = typeof row.speaker === 'string' && row.speaker.trim() ? row.speaker.trim() : undefined;
  const durationMs =
    typeof row.durationMs === 'number' && Number.isFinite(row.durationMs) ? row.durationMs : undefined;
  return { type, content: content.trim(), speaker, durationMs };
}

function playerRoleLabelFromState(st: Record<string, unknown> | undefined): string {
  const raw = st?.playerRoleProfile;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return '';
  const p = raw as Record<string, unknown>;
  if (p.mode === 'oc' && typeof p.name === 'string' && p.name.trim()) {
    return `原创｜${p.name.trim()}`;
  }
  if (p.mode === 'general' && typeof p.generalName === 'string' && p.generalName.trim()) {
    return `扮演｜${p.generalName.trim()}`;
  }
  return '';
}

function fallbackScenes(r: Record<string, unknown>, npcName: string): StoryScene[] {
  const scenes: StoryScene[] = [];
  if (typeof r.narration === 'string' && r.narration.trim()) {
    scenes.push({ type: 'narration', content: r.narration.trim() });
  }
  if (typeof r.dialogue === 'string' && r.dialogue.trim()) {
    scenes.push({ type: 'dialogue', content: r.dialogue.trim(), speaker: npcName });
  }
  return scenes;
}

export const useGameStore = create<GameStore>((set) => ({
  scenarioId: 'hulaguan',
  intent: '',
  scenes: [],
  currentSceneIndex: 0,
  playing: false,
  loading: false,
  hp: 100,
  maxHp: 100,
  rel: 0,
  round: 0,
  npcName: '吕布',
  pendingPlayerRoleProfile: null,
  playerRoleLabel: '',
  intentQuotaGranted: 10,
  intentQuotaConsumed: 0,
  intentQuotaRemaining: 10,
  setScenarioId: (scenarioId) => set({ scenarioId }),
  setIntent: (intent) => set({ intent }),
  setLoading: (loading) => set({ loading }),
  setPendingPlayerRoleProfile: (pendingPlayerRoleProfile) => set({ pendingPlayerRoleProfile }),
  clearPendingPlayerRoleProfile: () => set({ pendingPlayerRoleProfile: null }),
  resetScenes: () => set({ scenes: [], currentSceneIndex: 0, playing: false }),
  nextScene: () =>
    set((s) => {
      if (!s.playing) return s;
      const next = s.currentSceneIndex + 1;
      if (next >= s.scenes.length) {
        return { ...s, currentSceneIndex: Math.max(0, s.scenes.length - 1), playing: true };
      }
      return { ...s, currentSceneIndex: next };
    }),
  replayScenesFromStart: () =>
    set((s) => ({
      ...s,
      currentSceneIndex: s.scenes.length > 0 ? 0 : 0,
      playing: s.scenes.length > 0,
    })),
  applyCloudStateOnly: (st) =>
    set((s) => {
      let hp = s.hp;
      let maxHp = s.maxHp;
      let npcName = s.npcName;
      let rel = s.rel;
      let round = s.round;
      if (st.player) {
        const p = st.player as { hp: number; maxHp: number };
        hp = p.hp;
        maxHp = p.maxHp;
      }
      if (st.npcs) {
        const cur = (st.npcs as { current: { name: string; relationship: number } }).current;
        npcName = cur.name;
        rel = cur.relationship;
      }
      if (st.currentRound !== undefined) {
        round = Number(st.currentRound);
      }
      const playerRoleLabel = playerRoleLabelFromState(st) || s.playerRoleLabel;
      const q = readIntentQuotaFromState(st, {
        granted: s.intentQuotaGranted,
        consumed: s.intentQuotaConsumed,
        remaining: s.intentQuotaRemaining,
      });
      return {
        ...s,
        hp,
        maxHp,
        npcName,
        rel,
        round,
        playerRoleLabel,
        intentQuotaGranted: q.granted,
        intentQuotaConsumed: q.consumed,
        intentQuotaRemaining: q.remaining,
      };
    }),
  applyInteractSuccess: (text, r) =>
    set((s) => {
      const st = r.state as Record<string, unknown> | undefined;
      if (!st) {
        console.warn('[mud] applyInteractSuccess: missing r.state; HP/round/intent quota may be stale.');
      }
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
      const playerRoleLabel = st !== undefined ? playerRoleLabelFromState(st) : s.playerRoleLabel;
      const q = readIntentQuotaFromState(st, {
        granted: s.intentQuotaGranted,
        consumed: s.intentQuotaConsumed,
        remaining: s.intentQuotaRemaining,
      });
      const fromResponse = Array.isArray(r.scenes) ? r.scenes.map(asScene).filter(Boolean) as StoryScene[] : [];
      const scenes = fromResponse.length > 0 ? fromResponse : fallbackScenes(r, npcName);
      return {
        intent: text.trim() ? '' : s.intent,
        hp,
        maxHp,
        npcName,
        rel,
        round,
        playerRoleLabel,
        intentQuotaGranted: q.granted,
        intentQuotaConsumed: q.consumed,
        intentQuotaRemaining: q.remaining,
        scenes,
        currentSceneIndex: 0,
        playing: scenes.length > 0,
      };
    }),
}));
