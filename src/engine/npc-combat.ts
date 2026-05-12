import * as fs from 'fs';
import * as path from 'path';
import { ParseResponseError } from '../errors';
import type { NpcCombatState, Session, StateChanges } from '../types';
import { ensureEliminatedNpcFields } from '../sessions/intent-quota';
import { loadScenarioNpcRoster, mergeEliminatedNpcIds } from './eliminated-npcs';

const DEFAULT_NPC_MAX_HP = 100;

interface NpcFileCombat {
  id: string;
  name: string;
  combat?: { maxHp?: number };
}

function scenarioNpcPath(scenarioId: string, npcId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'npcs', `${npcId}.json`);
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function readNpcMaxHp(scenarioId: string, npcId: string): number {
  const npc = readJsonFile<NpcFileCombat>(scenarioNpcPath(scenarioId, npcId));
  const m = npc?.combat?.maxHp;
  if (typeof m === 'number' && Number.isFinite(m) && m > 0 && m <= 9999) {
    return Math.floor(m);
  }
  return DEFAULT_NPC_MAX_HP;
}

/** 新会话：按剧本 availableNpcs 初始化本会话卡司 HP 副本（只读剧本包，不写回 scenarios） */
export function initNpcCombatForSession(session: Session): void {
  const roster = loadScenarioNpcRoster(session.scenarioId);
  if (roster.length === 0) {
    session.npcCombatById = {};
    return;
  }
  const map: Record<string, NpcCombatState> = {};
  for (const { id } of roster) {
    const maxHp = readNpcMaxHp(session.scenarioId, id);
    map[id] = { hp: maxHp, maxHp };
  }
  session.npcCombatById = map;
}

/** 旧会话缺省：无副本或空表时按剧本重新初始化（与云/文件 loadSession 同类调用） */
export function ensureNpcCombatFields(session: Session): void {
  if (!session.npcCombatById || Object.keys(session.npcCombatById).length === 0) {
    initNpcCombatForSession(session);
  }
}

/**
 * 校验 npcHp 增量：每项须为有限数字；id 须在剧本卡司表中且本会话副本已有该键。
 */
export function assertNpcHpDeltasApplicable(session: Session, changes: StateChanges): void {
  const deltas = changes.npcHp;
  if (!deltas || deltas.length === 0) return;
  ensureNpcCombatFields(session);
  const roster = new Set(loadScenarioNpcRoster(session.scenarioId).map((e) => e.id));
  const cells = session.npcCombatById!;
  for (const row of deltas) {
    if (!row || typeof row.id !== 'string') {
      throw new ParseResponseError('stateChanges.npcHp 每项须含 id 字符串');
    }
    const id = row.id.trim();
    if (!id) {
      throw new ParseResponseError('stateChanges.npcHp id 不能为空');
    }
    if (!roster.has(id)) {
      throw new ParseResponseError(`stateChanges.npcHp 含未知卡司 id：${id}`);
    }
    if (!cells[id]) {
      throw new ParseResponseError('本会话卡司 HP 副本未初始化，请重试');
    }
    if (typeof row.delta !== 'number' || !Number.isFinite(row.delta)) {
      throw new ParseResponseError(`stateChanges.npcHp.delta 须为有限数字（id=${id}）`);
    }
  }
}

/** 合并模型给出的卡司 HP 增量；越界 clamp；hp≤0 时自动记入已退场 id */
export function applyNpcHpDeltas(session: Session, changes: StateChanges): void {
  const deltas = changes.npcHp;
  if (!deltas || deltas.length === 0) return;
  ensureEliminatedNpcFields(session);
  ensureNpcCombatFields(session);
  const roster = new Set(loadScenarioNpcRoster(session.scenarioId).map((e) => e.id));
  const cells = session.npcCombatById!;
  for (const row of deltas) {
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!id || !roster.has(id)) continue;
    const cell = cells[id];
    if (!cell) continue;
    const d = row.delta;
    if (typeof d !== 'number' || !Number.isFinite(d)) continue;
    let next = cell.hp + d;
    if (next < 0) next = 0;
    if (next > cell.maxHp) next = cell.maxHp;
    cell.hp = next;
    if (next <= 0) {
      mergeEliminatedNpcIds(session, [id]);
    }
  }
}

/** 供 prompt：id（正名）hp/maxHp，按 id 排序；过长则 clip */
export function formatNpcCombatPromptSection(
  scenarioId: string,
  npcCombatById: Record<string, NpcCombatState> | undefined,
  maxChars: number
): string {
  if (!npcCombatById || Object.keys(npcCombatById).length === 0) {
    return '（暂无卡司 HP 副本；新开剧本后应已初始化）';
  }
  const roster = loadScenarioNpcRoster(scenarioId);
  const nameById = new Map(roster.map((e) => [e.id, e.names[0] ?? e.id]));
  const lines = Object.keys(npcCombatById)
    .sort()
    .map((id) => {
      const c = npcCombatById[id];
      const label = nameById.get(id) ?? id;
      return `${id}（${label}）${c.hp}/${c.maxHp}`;
    });
  let text = lines.join('；');
  if (text.length > maxChars) {
    text = `${text.slice(0, maxChars)}…`;
  }
  return `以下为会话副本中的卡司 HP，须与叙事一致；若本轮有伤血/治疗/休整，请在 stateChanges.npcHp 中写出对各 id 的增量（delta），勿与旁白矛盾。\n${text}`;
}
