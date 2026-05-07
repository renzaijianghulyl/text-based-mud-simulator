/**
 * 与云函数下发的 intentQuota* 对齐：展示用 remaining 一律由 granted − consumed 推导，
 * 避免 intentQuotaRemaining 与 consumed 不同步时顶栏不更新。
 */
export function readIntentQuotaFromState(
  st: Record<string, unknown> | undefined,
  fallback: { granted: number; consumed: number; remaining: number }
): { granted: number; consumed: number; remaining: number } {
  if (!st) return fallback;
  const granted =
    typeof st.intentQuotaGranted === 'number' && Number.isFinite(st.intentQuotaGranted)
      ? st.intentQuotaGranted
      : fallback.granted;
  const consumed =
    typeof st.intentQuotaConsumed === 'number' && Number.isFinite(st.intentQuotaConsumed)
      ? st.intentQuotaConsumed
      : fallback.consumed;
  const remaining = Math.max(0, granted - consumed);
  const serverRemaining = st.intentQuotaRemaining;
  if (
    typeof serverRemaining === 'number' &&
    Number.isFinite(serverRemaining) &&
    serverRemaining !== remaining
  ) {
    console.warn(
      `[mud] intentQuotaRemaining from server (${serverRemaining}) ≠ granted−consumed (${remaining}); using derived.`
    );
  }
  return { granted, consumed, remaining };
}
