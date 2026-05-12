import type { CurrentNpc } from '../types';
import { XuanwuMenNpcRegistryError } from '../errors';
import {
  XUANWU_MEN_DEFAULT_TARGET_NPC_ID,
  getXuanwuMenNpcTemplateById,
  resolveXuanwuMenNpcIdForSession,
} from './xuanwu-men-npc-registry.generated';

export { pickRandomXuanwuMenNpcId, resolveXuanwuMenNpcIdForSession } from './xuanwu-men-npc-registry.generated';

/** 玄武门剧本 NPC 模板（云函数与本地共用注册表）。 */
export function getXuanwuMenNpcTemplate(requestedNpcId?: string): CurrentNpc {
  const id = resolveXuanwuMenNpcIdForSession(requestedNpcId);
  const row = getXuanwuMenNpcTemplateById(id) ?? getXuanwuMenNpcTemplateById(XUANWU_MEN_DEFAULT_TARGET_NPC_ID);
  if (!row) {
    throw new XuanwuMenNpcRegistryError('xuanwu-men npc registry missing default template');
  }
  return { ...row, relationship: 0 };
}
