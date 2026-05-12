import { describe, expect, it } from 'vitest';
import { resolveChibiInitialTargetNpcId } from '../sessions/chibi-initial-target';
import { CHIBI_AVAILABLE_NPC_IDS } from '../sessions/chibi-npc-registry.generated';

function assertValidNpcId(id: string): void {
  expect(CHIBI_AVAILABLE_NPC_IDS as readonly string[]).toContain(id);
}

describe('resolveChibiInitialTargetNpcId', () => {
  it('原创角色或缺 profile 时落在联军/军议侧合理池，不抽到扮演本人', () => {
    const oc = resolveChibiInitialTargetNpcId({
      mode: 'oc',
      name: '游侠',
      background: '联军帐下无名之辈',
    });
    assertValidNpcId(oc);
    expect(['lu-su', 'zhou-yu', 'zhu-ge-liang', 'liu-bei', 'cao-cao']).toContain(oc);

    const none = resolveChibiInitialTargetNpcId(undefined);
    assertValidNpcId(none);
    expect(['lu-su', 'zhou-yu', 'zhu-ge-liang', 'liu-bei', 'cao-cao']).toContain(none);
  });

  it('扮演刘备时首选周瑜/鲁肃/诸葛亮等，不落到刘备本人', () => {
    const id = resolveChibiInitialTargetNpcId({ mode: 'general', generalName: '刘备' });
    assertValidNpcId(id);
    expect(id).not.toBe('liu-bei');
    expect(['zhou-yu', 'lu-su', 'zhu-ge-liang', 'cao-cao']).toContain(id);
  });

  it('扮演曹操时首选周瑜或江北侧，不落到曹操本人', () => {
    const id = resolveChibiInitialTargetNpcId({ mode: 'general', generalName: '曹操' });
    assertValidNpcId(id);
    expect(id).not.toBe('cao-cao');
    expect(['zhou-yu', 'cheng-yu', 'liu-bei', 'zhang-liao']).toContain(id);
  });

  it('扮演周瑜时对手/盟友池不含周瑜本人', () => {
    const id = resolveChibiInitialTargetNpcId({ mode: 'general', generalName: '周瑜' });
    assertValidNpcId(id);
    expect(id).not.toBe('zhou-yu');
    expect(['zhu-ge-liang', 'liu-bei', 'cao-cao', 'sun-quan']).toContain(id);
  });

  it('未知武将名回落到 OC 池', () => {
    const id = resolveChibiInitialTargetNpcId({ mode: 'general', generalName: '虚构人' });
    assertValidNpcId(id);
    expect(['lu-su', 'zhou-yu', 'zhu-ge-liang', 'liu-bei', 'cao-cao']).toContain(id);
  });
});
