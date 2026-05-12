import * as fs from 'fs';
import * as path from 'path';
import type { Session, StoryScene } from '../types';
import { ensureEliminatedNpcFields } from '../sessions/intent-quota';

interface ScenarioConfigElim {
  availableNpcs?: string[];
}

interface NpcFileElim {
  id: string;
  name: string;
  aliases?: string[];
}

function scenarioConfigPath(scenarioId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'config.json');
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

export interface ScenarioNpcRosterEntry {
  id: string;
  names: string[];
}

/** 剧本卡司 id + 正名/别名（只读剧本包） */
export function loadScenarioNpcRoster(scenarioId: string): ScenarioNpcRosterEntry[] {
  const config = readJsonFile<ScenarioConfigElim>(scenarioConfigPath(scenarioId));
  const ids = config?.availableNpcs?.filter((x) => typeof x === 'string' && x.trim()) ?? [];
  const out: ScenarioNpcRosterEntry[] = [];
  for (const id of ids) {
    const npc = readJsonFile<NpcFileElim>(scenarioNpcPath(scenarioId, id));
    const names = [npc?.name, ...(npc?.aliases ?? [])]
      .filter((x): x is string => typeof x === 'string' && x.trim().length > 0)
      .map((s) => s.trim());
    if (names.length > 0) {
      out.push({ id, names });
    }
  }
  return out;
}

function rosterIdSet(scenarioId: string): Set<string> {
  return new Set(loadScenarioNpcRoster(scenarioId).map((e) => e.id));
}

/** 合并退场 id（去重）；丢弃不在剧本卡司中的 id */
export function mergeEliminatedNpcIds(session: Session, ids: readonly string[] | undefined): void {
  if (!ids || ids.length === 0) return;
  ensureEliminatedNpcFields(session);
  const allowed = rosterIdSet(session.scenarioId);
  for (const raw of ids) {
    if (typeof raw !== 'string') continue;
    const id = raw.trim();
    if (!id || !allowed.has(id)) continue;
    if (!session.eliminatedNpcIds!.includes(id)) {
      session.eliminatedNpcIds!.push(id);
    }
  }
}

/**
 * 保守阵亡/退场启发式：同一幕文本须同时出现「退场语义」与卡司正名/别名之一。
 * 扮演武将（general）且与某卡司正名同字时，不自动将该卡司 id 记为退场，避免玩家死亡叙事误伤卡司位。
 */
const DEATH_CONTEXT_RE =
  /(?:被斩|斩于马下|斩首(?:示众)?|当场阵亡|阵亡|殒命|毙命|气绝身亡|气绝|身死当场|身死|人头落地|身首异处|伏诛|授首|诛杀|格杀|殁于|死于战|战死|落马而亡|命丧)/;

function playerGeneralNameIfAny(session: Session): string | undefined {
  const pr = session.playerRoleProfile;
  if (pr?.mode === 'general' && pr.generalName.trim()) {
    return pr.generalName.trim();
  }
  return undefined;
}

function shouldSkipRosterEntryForInfer(session: Session, entry: ScenarioNpcRosterEntry): boolean {
  const g = playerGeneralNameIfAny(session);
  if (!g) return false;
  return entry.names.some((n) => n === g);
}

export function inferEliminatedNpcIdsFromScenes(
  session: Session,
  scenes: StoryScene[] | undefined
): string[] {
  if (!scenes || scenes.length === 0) return [];
  const roster = loadScenarioNpcRoster(session.scenarioId);
  const found = new Set<string>();
  for (const scene of scenes) {
    const speakerPart =
      scene.type === 'dialogue' && scene.speaker && scene.speaker.trim() ? `${scene.speaker} ` : '';
    const txt = `${speakerPart}${scene.content ?? ''}`;
    if (!DEATH_CONTEXT_RE.test(txt)) continue;
    for (const entry of roster) {
      if (shouldSkipRosterEntryForInfer(session, entry)) continue;
      if (found.has(entry.id)) continue;
      if (entry.names.some((n) => n.length > 0 && txt.includes(n))) {
        found.add(entry.id);
      }
    }
  }
  return [...found];
}

/** 供 prompt 一行展示：id（正名） */
export function formatEliminatedNpcLabels(scenarioId: string, ids: readonly string[]): string {
  if (ids.length === 0) return '';
  const roster = loadScenarioNpcRoster(scenarioId);
  const byId = new Map(roster.map((e) => [e.id, e.names[0] ?? e.id]));
  return ids.map((id) => `${id}（${byId.get(id) ?? id}）`).join('、');
}
