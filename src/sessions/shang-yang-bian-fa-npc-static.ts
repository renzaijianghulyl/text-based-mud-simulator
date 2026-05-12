import type { CurrentNpc } from '../types';
import { ShangYangBianFaNpcRegistryError } from '../errors';
import {
  SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID,
  getShangYangBianFaNpcTemplateById,
  resolveShangYangBianFaNpcIdForSession,
} from './shang-yang-bian-fa-npc-registry.generated';

export { pickRandomShangYangBianFaNpcId, resolveShangYangBianFaNpcIdForSession } from './shang-yang-bian-fa-npc-registry.generated';

/** 商鞅变法剧本 NPC 模板（云函数与本地共用注册表）。 */
export function getShangYangBianFaNpcTemplate(requestedNpcId?: string): CurrentNpc {
  const id = resolveShangYangBianFaNpcIdForSession(requestedNpcId);
  const row = getShangYangBianFaNpcTemplateById(id) ?? getShangYangBianFaNpcTemplateById(SHANG_YANG_BIAN_FA_DEFAULT_TARGET_NPC_ID);
  if (!row) {
    throw new ShangYangBianFaNpcRegistryError('shang-yang-bian-fa npc registry missing default template');
  }
  return { ...row, relationship: 0 };
}
