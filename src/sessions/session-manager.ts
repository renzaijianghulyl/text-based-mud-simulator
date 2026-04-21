import type { Session } from '../types';
import { SessionNotFoundError } from '../errors';
import { buildDemoSessionFromNpc, sessionKey } from './build-demo-session';
import * as fs from 'fs';
import * as path from 'path';

const SESSIONS_DIR = path.join(process.cwd(), '.sessions');

// 确保目录存在
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

function sessionFilePath(sessionId: string): string {
  return path.join(SESSIONS_DIR, `${sessionId}.json`);
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

interface ScenarioConfig {
  id: string;
  defaultTarget?: string;
  availableNpcs?: string[];
}

interface NpcFile {
  id: string;
  name: string;
  title?: string;
  personality?: string;
  motivation?: string;
  speakingStyle?: string;
  equipment?: string[];
  mount?: string;
  redLines?: string[];
}

function scenarioConfigPath(scenarioId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'config.json');
}

function scenarioNpcPath(scenarioId: string, npcId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'npcs', `${npcId}.json`);
}

function readScenarioConfig(scenarioId: string): ScenarioConfig | null {
  const filePath = scenarioConfigPath(scenarioId);
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ScenarioConfig;
}

function resolveNpcId(scenarioId: string, requestedNpcId?: string): string {
  const config = readScenarioConfig(scenarioId);
  const candidate = requestedNpcId?.trim();
  if (candidate) {
    const inAvailable =
      !config?.availableNpcs || config.availableNpcs.length === 0
        ? true
        : config.availableNpcs.includes(candidate);
    if (inAvailable && fs.existsSync(scenarioNpcPath(scenarioId, candidate))) {
      return candidate;
    }
  }
  if (config?.defaultTarget && fs.existsSync(scenarioNpcPath(scenarioId, config.defaultTarget))) {
    return config.defaultTarget;
  }
  return 'lv-bu';
}

function loadNpcTemplate(scenarioId: string, requestedNpcId?: string) {
  const npcId = resolveNpcId(scenarioId, requestedNpcId);
  const filePath = scenarioNpcPath(scenarioId, npcId);
  if (!fs.existsSync(filePath)) {
    return {
      id: 'lv-bu',
      name: '吕布',
      title: '飞将',
      personality: '高傲、易怒、但爱才',
      motivation: '证明自己是天下第一猛将',
      equipment: ['方天画戟', '兽面吞头连环铠'],
      mount: '赤兔马',
      redLines: ['被骂“三姓家奴”', '被刺杀', '被背叛'],
      relationship: 0,
    };
  }

  const raw = fs.readFileSync(filePath, 'utf-8');
  const npc = JSON.parse(raw) as NpcFile;
  return {
    id: npc.id,
    name: npc.name,
    title: npc.title,
    personality: npc.personality || '沉稳',
    motivation: npc.motivation || '达成当前目标',
    speakingStyle: npc.speakingStyle,
    equipment: npc.equipment,
    mount: npc.mount,
    redLines: npc.redLines || [],
    relationship: 0,
  };
}

/**
 * 文件系统持久化：后续可替换为云数据库实现。sessionId = `${userId}_${scenarioId}`。
 */
export async function loadSession(userId: string, scenarioId: string): Promise<Session> {
  const id = sessionKey(userId, scenarioId);
  const filePath = sessionFilePath(id);
  
  if (!fs.existsSync(filePath)) {
    throw new SessionNotFoundError(id);
  }
  
  const json = fs.readFileSync(filePath, 'utf-8');
  const session: Session = JSON.parse(json);
  return deepClone(session);
}

export async function saveSession(session: Session): Promise<void> {
  const filePath = sessionFilePath(session.sessionId);
  const json = JSON.stringify(session, null, 2);
  fs.writeFileSync(filePath, json, 'utf-8');
}

export async function deleteSession(userId: string, scenarioId: string): Promise<void> {
  const id = sessionKey(userId, scenarioId);
  const filePath = sessionFilePath(id);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/** 测试或演示用：清空文件存储 */
export function __resetMockSessionsForTest(): void {
  if (fs.existsSync(SESSIONS_DIR)) {
    fs.rmSync(SESSIONS_DIR, { recursive: true, force: true });
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

/** 构造一条可写入 mock 的演示会话（NPC 数据为深拷贝来源的副本，不引用外部对象） */
export function buildDemoSession(userId: string, scenarioId: string, targetNpcId?: string): Session {
  const npcTemplate = loadNpcTemplate(scenarioId, targetNpcId);
  return deepClone(buildDemoSessionFromNpc(userId, scenarioId, npcTemplate));
}
