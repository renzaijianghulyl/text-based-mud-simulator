import { describe, expect, it } from 'vitest';
import { buildDemoSession } from '../adapters/wechat/cloud-session-store';
import { ScenarioUnsupportedError } from '../errors';

describe('cloud-session-store buildDemoSession', () => {
  it('unsupported scenario throws ScenarioUnsupportedError', () => {
    expect(() => buildDemoSession('u1', 'unknown-scenario-id-xyz')).toThrow(ScenarioUnsupportedError);
  });

  it('chibi new game builds session with current npc', () => {
    const s = buildDemoSession('u-chibi-cloud-test', 'chibi');
    expect(s.scenarioId).toBe('chibi');
    expect(s.npcs.current.id).toBeTruthy();
    expect(s.npcs.current.name).toBeTruthy();
  });

  it('hulaguan new game builds session', () => {
    const s = buildDemoSession('u-hg-cloud-test', 'hulaguan');
    expect(s.scenarioId).toBe('hulaguan');
    expect(s.npcs.current.id).toBeTruthy();
  });

  it('xuanwu-men new game builds session with npcCombat keys', () => {
    const s = buildDemoSession('u-xw-cloud-test', 'xuanwu-men');
    expect(s.scenarioId).toBe('xuanwu-men');
    expect(s.npcs.current.id).toBeTruthy();
    expect(s.npcCombatById?.['li-shi-min']).toBeDefined();
  });

  it('shang-yang-bian-fa new game builds session with npcCombat keys', () => {
    const s = buildDemoSession('u-sy-cloud-test', 'shang-yang-bian-fa');
    expect(s.scenarioId).toBe('shang-yang-bian-fa');
    expect(s.npcs.current.id).toBeTruthy();
    expect(s.npcCombatById?.['shang-yang']).toBeDefined();
  });
});
