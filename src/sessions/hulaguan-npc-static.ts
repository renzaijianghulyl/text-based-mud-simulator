import type { CurrentNpc } from '../types';
import {
  getHulaguanNpcTemplateById,
  HULAGUAN_DEFAULT_TARGET_NPC_ID,
  resolveHulaguanNpcIdForSession,
} from './hulaguan-npc-registry.generated';

export { pickRandomHulaguanNpcId, resolveHulaguanNpcIdForSession } from './hulaguan-npc-registry.generated';

/**
 * 按 id 解析虎牢关 NPC 模板（云函数与本地共用注册表）。
 * `requestedNpcId` 为空或无效时随机选用可用武将之一。
 */
export function getHulaguanNpcTemplate(requestedNpcId?: string): CurrentNpc {
  const id = resolveHulaguanNpcIdForSession(requestedNpcId);
  const row =
    getHulaguanNpcTemplateById(id) ?? getHulaguanNpcTemplateById(HULAGUAN_DEFAULT_TARGET_NPC_ID);
  if (!row) {
    throw new Error('hulaguan npc registry missing default template');
  }
  return { ...row, relationship: 0 };
}
