import type { PlayerRoleProfile, Session } from '../types';
import { SessionNotFoundError } from '../errors';
import { buildDemoSessionFromNpc, sessionKey } from './build-demo-session';
import { ensureNpcCombatFields } from '../engine/npc-combat';
import { ensureEliminatedNpcFields, ensureIntentQuotaFields } from './intent-quota';
import { getChibiNpcTemplate } from './chibi-npc-static';
import { getHulaguanNpcTemplate } from './hulaguan-npc-static';
import { getXuanwuMenNpcTemplate } from './xuanwu-men-npc-static';
import { getShangYangBianFaNpcTemplate } from './shang-yang-bian-fa-npc-static';
import { resolveChibiInitialTargetNpcId } from './chibi-initial-target';
import { resolveHulaguanInitialTargetNpcId } from './hulaguan-initial-target';
import { resolveXuanwuMenInitialTargetNpcId } from './xuanwu-men-initial-target';
import { resolveShangYangBianFaInitialTargetNpcId } from './shang-yang-bian-fa-initial-target';
import { getScenariosRoot } from './scenario-paths';
import type { SessionStore } from './session-store-types';
import * as fs from 'fs';
import * as path from 'path';

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export interface FileSessionStoreOptions {
  /** 会话 JSON 存放目录，默认 `process.cwd()/.sessions` */
  sessionsDir?: string;
  /** 剧本包根目录，默认由 `getScenariosRoot()` 解析（支持 `SCENARIOS_ROOT`） */
  scenariosRoot?: string;
}

interface ScenarioConfig {
  id: string;
  defaultTarget?: string;
  availableNpcs?: string[];
  npcRoles?: Record<string, string>;
}

interface NpcFile {
  id: string;
  name: string;
  aliases?: string[];
  title?: string;
  personality?: string;
  motivation?: string;
  speakingStyle?: string;
  equipment?: string[];
  mount?: string;
  redLines?: string[];
}

/**
 * 本地文件系统版 `SessionStore`：读 `scenarios/<id>/`，写 `.sessions/*.json`。
 */
export class FileSessionStore implements SessionStore {
  private readonly sessionsDir: string;
  private readonly scenariosRoot: string;

  constructor(options: FileSessionStoreOptions = {}) {
    this.sessionsDir =
      options.sessionsDir?.trim() !== undefined && options.sessionsDir.trim() !== ''
        ? path.resolve(options.sessionsDir.trim())
        : path.join(process.cwd(), '.sessions');
    this.scenariosRoot = options.scenariosRoot?.trim()
      ? path.resolve(options.scenariosRoot.trim())
      : getScenariosRoot();
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  private sessionFilePath(sessionId: string): string {
    return path.join(this.sessionsDir, `${sessionId}.json`);
  }

  private scenarioConfigPath(scenarioId: string): string {
    return path.join(this.scenariosRoot, scenarioId, 'config.json');
  }

  private scenarioNpcPath(scenarioId: string, npcId: string): string {
    return path.join(this.scenariosRoot, scenarioId, 'npcs', `${npcId}.json`);
  }

  private readScenarioConfig(scenarioId: string): ScenarioConfig | null {
    const filePath = this.scenarioConfigPath(scenarioId);
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as ScenarioConfig;
  }

  private resolveNpcId(scenarioId: string, requestedNpcId?: string): string {
    const config = this.readScenarioConfig(scenarioId);
    const candidate = requestedNpcId?.trim();
    if (candidate) {
      const inAvailable =
        !config?.availableNpcs || config.availableNpcs.length === 0
          ? true
          : config.availableNpcs.includes(candidate);
      if (inAvailable && fs.existsSync(this.scenarioNpcPath(scenarioId, candidate))) {
        return candidate;
      }
    }
    if (config?.defaultTarget && fs.existsSync(this.scenarioNpcPath(scenarioId, config.defaultTarget))) {
      return config.defaultTarget;
    }
    const first = config?.availableNpcs?.find((id) => fs.existsSync(this.scenarioNpcPath(scenarioId, id)));
    if (first) return first;
    return 'lv-bu';
  }

  private loadNpcTemplate(scenarioId: string, requestedNpcId?: string) {
    if (scenarioId === 'hulaguan') {
      return getHulaguanNpcTemplate(requestedNpcId);
    }
    if (scenarioId === 'chibi') {
      const npcId = this.resolveNpcId(scenarioId, requestedNpcId);
      return getChibiNpcTemplate(npcId);
    }
    if (scenarioId === 'xuanwu-men') {
      const npcId = this.resolveNpcId(scenarioId, requestedNpcId);
      return getXuanwuMenNpcTemplate(npcId);
    }
    if (scenarioId === 'shang-yang-bian-fa') {
      const npcId = this.resolveNpcId(scenarioId, requestedNpcId);
      return getShangYangBianFaNpcTemplate(npcId);
    }
    const npcId = this.resolveNpcId(scenarioId, requestedNpcId);
    const filePath = this.scenarioNpcPath(scenarioId, npcId);
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

  buildDemoSession(
    userId: string,
    scenarioId: string,
    targetNpcId?: string,
    playerRoleProfile?: PlayerRoleProfile
  ): Session {
    let effectiveNpcId = targetNpcId;
    if (scenarioId === 'hulaguan' && (!effectiveNpcId || !String(effectiveNpcId).trim())) {
      effectiveNpcId = resolveHulaguanInitialTargetNpcId(playerRoleProfile);
    }
    if (scenarioId === 'chibi' && (!effectiveNpcId || !String(effectiveNpcId).trim())) {
      effectiveNpcId = resolveChibiInitialTargetNpcId(playerRoleProfile);
    }
    if (scenarioId === 'xuanwu-men' && (!effectiveNpcId || !String(effectiveNpcId).trim())) {
      effectiveNpcId = resolveXuanwuMenInitialTargetNpcId(playerRoleProfile);
    }
    if (scenarioId === 'shang-yang-bian-fa' && (!effectiveNpcId || !String(effectiveNpcId).trim())) {
      effectiveNpcId = resolveShangYangBianFaInitialTargetNpcId(playerRoleProfile);
    }
    const npcTemplate = this.loadNpcTemplate(scenarioId, effectiveNpcId);
    return deepClone(buildDemoSessionFromNpc(userId, scenarioId, npcTemplate, playerRoleProfile));
  }

  async sessionExists(userId: string, scenarioId: string): Promise<boolean> {
    const id = sessionKey(userId, scenarioId);
    return fs.existsSync(this.sessionFilePath(id));
  }

  async loadSession(userId: string, scenarioId: string): Promise<Session> {
    const id = sessionKey(userId, scenarioId);
    const filePath = this.sessionFilePath(id);
    if (!fs.existsSync(filePath)) {
      throw new SessionNotFoundError(id);
    }
    const json = fs.readFileSync(filePath, 'utf-8');
    const session: Session = JSON.parse(json);
    ensureIntentQuotaFields(session);
    ensureEliminatedNpcFields(session);
    ensureNpcCombatFields(session);
    return deepClone(session);
  }

  async saveSession(session: Session): Promise<void> {
    const filePath = this.sessionFilePath(session.sessionId);
    const json = JSON.stringify(session, null, 2);
    fs.writeFileSync(filePath, json, 'utf-8');
  }

  async deleteSession(userId: string, scenarioId: string): Promise<void> {
    const id = sessionKey(userId, scenarioId);
    const filePath = this.sessionFilePath(id);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }

  /** 测试用：清空本 store 使用的会话目录 */
  resetSessionsDirForTest(): void {
    if (fs.existsSync(this.sessionsDir)) {
      fs.rmSync(this.sessionsDir, { recursive: true, force: true });
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }
}

let defaultStore: FileSessionStore | null = null;

export function getDefaultFileSessionStore(): FileSessionStore {
  if (!defaultStore) {
    const sessionsDir =
      process.env.SESSIONS_DIR?.trim() !== undefined && process.env.SESSIONS_DIR.trim() !== ''
        ? path.resolve(process.env.SESSIONS_DIR.trim())
        : undefined;
    defaultStore = new FileSessionStore({ sessionsDir });
  }
  return defaultStore;
}

export function createFileSessionStore(options?: FileSessionStoreOptions): FileSessionStore {
  return new FileSessionStore(options);
}

/** 供测试在单测间替换默认 store */
export function __setDefaultFileSessionStoreForTest(store: FileSessionStore | null): void {
  defaultStore = store;
}
