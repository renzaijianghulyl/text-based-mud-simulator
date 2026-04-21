import { describe, it, expect, beforeEach, vi } from 'vitest';
import path from 'node:path';
import fs from 'node:fs/promises';
import {
  __resetMockSessionsForTest,
  buildDemoSession,
  deleteSession,
  loadSession,
  saveSession,
} from '../sessions/session-manager';
import { process as runProcess } from '../engine/engine';

vi.mock('../engine/llm-adapter', () => ({
  callLLM: vi.fn(async () =>
    JSON.stringify({
      narration: '你与吕布在营前对峙，气氛紧绷。',
      dialogue: '吕布：若有胆，便来战！',
      stateChanges: { hp: -10, relationship: -15, reason: '言语冲突升级' },
    })
  ),
}));

describe('integration', () => {
  beforeEach(() => {
    __resetMockSessionsForTest();
  });

  it('可加载虎牢关剧本包并校验关键文件字段', async () => {
    const base = path.resolve(process.cwd(), 'scenarios/hulaguan');
    const configRaw = await fs.readFile(path.join(base, 'config.json'), 'utf8');
    const locRaw = await fs.readFile(path.join(base, 'geography/locations.json'), 'utf8');
    const config = JSON.parse(configRaw) as Record<string, unknown>;
    const locations = JSON.parse(locRaw) as { locations: Array<Record<string, unknown>> };

    expect(config.id).toBe('hulaguan');
    expect(config.name).toBe('虎牢关之战');
    expect(Array.isArray(locations.locations)).toBe(true);
    expect(locations.locations.length).toBeGreaterThanOrEqual(2);
    expect(locations.locations[0]).toHaveProperty('id');
    expect(locations.locations[0]).toHaveProperty('description');
  });

  it('会话可创建、保存、读取、删除（mock）', async () => {
    const session = buildDemoSession('u-integration', 'hulaguan');
    await saveSession(session);

    const loaded = await loadSession('u-integration', 'hulaguan');
    expect(loaded.sessionId).toBe('u-integration_hulaguan');
    expect(loaded.player.hp).toBe(100);

    loaded.player.hp = 88;
    const loadedAgain = await loadSession('u-integration', 'hulaguan');
    expect(loadedAgain.player.hp).toBe(100);

    await deleteSession('u-integration', 'hulaguan');
    await expect(loadSession('u-integration', 'hulaguan')).rejects.toThrow();
  });

  it('process 流程可跑通并落库后可再次读取', async () => {
    const session = buildDemoSession('u-process', 'hulaguan');
    await saveSession(session);
    const loaded = await loadSession('u-process', 'hulaguan');

    const result = await runProcess(loaded, '拔剑挑衅吕布');
    expect(result.narration.length).toBeGreaterThan(0);
    expect(result.dialogue.length).toBeGreaterThan(0);
    expect(result.changes.hp).toBe(-10);
    expect(result.state.player.hp).toBe(90);
    expect(result.state.npcs.current.relationship).toBe(-15);
    expect(result.state.recentSummaryLines.length).toBe(1);
    expect(result.state.history.length).toBe(1);

    await saveSession(result.state);
    const reloaded = await loadSession('u-process', 'hulaguan');
    expect(reloaded.player.hp).toBe(90);
    expect(reloaded.history.length).toBe(1);
  });
});
