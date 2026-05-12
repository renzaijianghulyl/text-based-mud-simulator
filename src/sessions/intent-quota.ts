import type { Session } from '../types';

export const INITIAL_INTENT_QUOTA_GRANTED = 10;
export const INTENT_QUOTA_PER_SHARE = 5;
/** 单局会话内通过「分享领奖」最多叠加的次数，防止异常刷接口 */
export const MAX_INTENT_SHARE_CLAIMS_PER_SESSION = 30;

export function ensureIntentQuotaFields(session: Session): void {
  if (typeof session.intentQuotaGranted !== 'number' || !Number.isFinite(session.intentQuotaGranted)) {
    session.intentQuotaGranted = INITIAL_INTENT_QUOTA_GRANTED;
  }
  if (typeof session.intentQuotaConsumed !== 'number' || !Number.isFinite(session.intentQuotaConsumed)) {
    session.intentQuotaConsumed = 0;
  }
  if (typeof session.intentQuotaShareClaims !== 'number' || !Number.isFinite(session.intentQuotaShareClaims)) {
    session.intentQuotaShareClaims = 0;
  }
}

export function intentQuotaRemaining(session: Session): number {
  ensureIntentQuotaFields(session);
  return Math.max(0, session.intentQuotaGranted - session.intentQuotaConsumed);
}

/** 旧会话缺省迁移：与 ensureIntentQuotaFields 同类调用点（云/文件加载、云函数入口） */
export function ensureEliminatedNpcFields(session: Session): void {
  if (!Array.isArray(session.eliminatedNpcIds)) {
    session.eliminatedNpcIds = [];
  }
}
