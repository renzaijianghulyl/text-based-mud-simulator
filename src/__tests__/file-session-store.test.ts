import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { SessionNotFoundError } from '../errors';
import { FileSessionStore } from '../sessions/file-session-store';
import { getScenariosRoot } from '../sessions/scenario-paths';

describe('FileSessionStore', () => {
  let tmpSessions: string;
  let store: FileSessionStore;

  beforeEach(() => {
    tmpSessions = fs.mkdtempSync(path.join(os.tmpdir(), 'mud-sess-'));
    store = new FileSessionStore({
      sessionsDir: tmpSessions,
      scenariosRoot: getScenariosRoot(),
    });
  });

  afterEach(() => {
    if (fs.existsSync(tmpSessions)) {
      fs.rmSync(tmpSessions, { recursive: true, force: true });
    }
  });

  it('sessionExists 在无存档时为 false', async () => {
    expect(await store.sessionExists('u1', 'hulaguan')).toBe(false);
  });

  it('buildDemoSession + save + load + sessionExists 为 true', async () => {
    const s = store.buildDemoSession('u2', 'hulaguan');
    await store.saveSession(s);
    expect(await store.sessionExists('u2', 'hulaguan')).toBe(true);
    const loaded = await store.loadSession('u2', 'hulaguan');
    expect(loaded.userId).toBe('u2');
    expect(loaded.scenarioId).toBe('hulaguan');
  });

  it('deleteSession 后 sessionExists 为 false', async () => {
    const s = store.buildDemoSession('u3', 'hulaguan');
    await store.saveSession(s);
    await store.deleteSession('u3', 'hulaguan');
    expect(await store.sessionExists('u3', 'hulaguan')).toBe(false);
  });

  it('resetSessionsDirForTest 清空目录', async () => {
    const s = store.buildDemoSession('u4', 'hulaguan');
    await store.saveSession(s);
    store.resetSessionsDirForTest();
    expect(await store.sessionExists('u4', 'hulaguan')).toBe(false);
  });

  it('loadSession 在无文件时抛出 SessionNotFoundError', async () => {
    await expect(store.loadSession('none', 'hulaguan')).rejects.toBeInstanceOf(SessionNotFoundError);
  });

  it('deleteSession 在文件不存在时不抛错', async () => {
    await expect(store.deleteSession('ghost', 'hulaguan')).resolves.toBeUndefined();
  });
});

describe('FileSessionStore 非 hulaguan 剧本目录', () => {
  let tmpSessions: string;
  let tmpScenarios: string;

  beforeEach(() => {
    tmpSessions = fs.mkdtempSync(path.join(os.tmpdir(), 'mud-sess-'));
    tmpScenarios = fs.mkdtempSync(path.join(os.tmpdir(), 'mud-scen-'));
    const sid = 'mini-scen';
    const scenDir = path.join(tmpScenarios, sid);
    fs.mkdirSync(path.join(scenDir, 'npcs'), { recursive: true });
    fs.writeFileSync(
      path.join(scenDir, 'config.json'),
      JSON.stringify({
        id: sid,
        defaultTarget: 'hero',
        availableNpcs: ['hero'],
      }),
      'utf-8'
    );
    fs.writeFileSync(
      path.join(scenDir, 'npcs', 'hero.json'),
      JSON.stringify({
        id: 'hero',
        name: '无名氏',
        title: '游侠',
        personality: '谨慎',
        motivation: '求生',
      }),
      'utf-8'
    );
  });

  afterEach(() => {
    for (const d of [tmpSessions, tmpScenarios]) {
      if (d && fs.existsSync(d)) fs.rmSync(d, { recursive: true, force: true });
    }
  });

  it('从自定义 scenariosRoot 读取 NPC 构建会话', () => {
    const sid = 'mini-scen';
    const store = new FileSessionStore({
      sessionsDir: tmpSessions,
      scenariosRoot: tmpScenarios,
    });
    const s = store.buildDemoSession('p1', sid, 'hero');
    expect(s.scenarioId).toBe(sid);
    expect(s.npcs.current.id).toBe('hero');
    expect(s.npcs.current.name).toBe('无名氏');
  });
});
