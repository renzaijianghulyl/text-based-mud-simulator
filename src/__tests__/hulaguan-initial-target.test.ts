import { describe, expect, it } from 'vitest';
import { resolveHulaguanInitialTargetNpcId } from '../sessions/hulaguan-initial-target';
import { HULAGUAN_AVAILABLE_NPC_IDS } from '../sessions/hulaguan-npc-registry.generated';

function assertValidNpcId(id: string): void {
  expect(HULAGUAN_AVAILABLE_NPC_IDS as readonly string[]).toContain(id);
}

describe('resolveHulaguanInitialTargetNpcId', () => {
  it('原创角色优先联军阵前线，不应默认董卓', () => {
    const id = resolveHulaguanInitialTargetNpcId({
      mode: 'oc',
      name: '游侠',
      background: '联军帐下无名之辈',
    });
    assertValidNpcId(id);
    expect(id).not.toBe('dong-zhuo');
    expect(['xiahou-dun', 'hua-xiong', 'lv-bu', 'yuan-shao', 'cao-cao']).toContain(id);
  });

  it('无 profile 时与 OC 回落一致', () => {
    const id = resolveHulaguanInitialTargetNpcId(undefined);
    assertValidNpcId(id);
    expect(id).not.toBe('dong-zhuo');
  });

  it('扮演张飞时首选关前对线（吕布/华雄等），不抽到张飞本人', () => {
    const id = resolveHulaguanInitialTargetNpcId({ mode: 'general', generalName: '张飞' });
    assertValidNpcId(id);
    expect(id).not.toBe('zhang-fei');
    expect(['lv-bu', 'hua-xiong', 'cao-cao', 'yuan-shao', 'xiahou-dun']).toContain(id);
  });

  it('扮演董卓时首选讨董对立面盟军代表', () => {
    const id = resolveHulaguanInitialTargetNpcId({ mode: 'general', generalName: '董卓' });
    assertValidNpcId(id);
    expect(id).not.toBe('dong-zhuo');
    expect(['cao-cao', 'yuan-shao', 'liu-bei', 'guan-yu', 'lv-bu']).toContain(id);
  });

  it('扮演吕布时首选盟军名将侧', () => {
    const id = resolveHulaguanInitialTargetNpcId({ mode: 'general', generalName: '吕布' });
    assertValidNpcId(id);
    expect(id).not.toBe('lv-bu');
    expect(['guan-yu', 'zhang-fei', 'liu-bei', 'cao-cao', 'yuan-shao']).toContain(id);
  });

  it('未知武将名回落到 OC 池', () => {
    const id = resolveHulaguanInitialTargetNpcId({ mode: 'general', generalName: '虚构人' });
    assertValidNpcId(id);
    expect(id).not.toBe('dong-zhuo');
  });
});
