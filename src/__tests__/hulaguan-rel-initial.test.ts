import { describe, expect, it } from 'vitest';
import { buildDemoSessionFromNpc } from '../sessions/build-demo-session';
import { getHulaguanInitialRel } from '../sessions/hulaguan-npc-registry.generated';
import { getHulaguanNpcTemplate } from '../sessions/hulaguan-npc-static';

describe('hulaguan initial relationship matrix', () => {
  it('刘备对吕布为剧本死敌数值', () => {
    expect(getHulaguanInitialRel('liu-bei', 'lv-bu')).toBe(-80);
    expect(getHulaguanInitialRel('lv-bu', 'liu-bei')).toBe(-80);
  });

  it('扮演刘备开局对阵吕布时写入 session 玩家→当前 NPC 关系', () => {
    const npc = getHulaguanNpcTemplate('lv-bu');
    const s = buildDemoSessionFromNpc('u1', 'hulaguan', npc, {
      mode: 'general',
      generalName: '刘备',
    });
    expect(s.npcs.current.relationship).toBe(-80);
    expect(s.relationships['lv-bu']).toBe(-80);
  });

  it('原创角色无扮演 id 时关系仍为模板默认 0', () => {
    const npc = getHulaguanNpcTemplate('lv-bu');
    const s = buildDemoSessionFromNpc('u1', 'hulaguan', npc, {
      mode: 'oc',
      name: '某人',
      background: '测试背景',
    });
    expect(s.npcs.current.relationship).toBe(0);
  });
});
