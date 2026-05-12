import type { CurrentNpc } from '../types';
import { ChibiNpcRegistryError } from '../errors';
import {
  CHIBI_DEFAULT_TARGET_NPC_ID,
  getChibiNpcTemplateById,
  resolveChibiNpcIdForSession,
} from './chibi-npc-registry.generated';

export { pickRandomChibiNpcId, resolveChibiNpcIdForSession } from './chibi-npc-registry.generated';

/** 赤壁剧本 NPC 模板（云函数与本地共用注册表）。 */
export function getChibiNpcTemplate(requestedNpcId?: string): CurrentNpc {
  const id = resolveChibiNpcIdForSession(requestedNpcId);
  const row = getChibiNpcTemplateById(id) ?? getChibiNpcTemplateById(CHIBI_DEFAULT_TARGET_NPC_ID);
  if (!row) {
    throw new ChibiNpcRegistryError('chibi npc registry missing default template');
  }
  return { ...row, relationship: 0 };
}
