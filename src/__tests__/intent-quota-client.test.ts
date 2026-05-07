import { describe, expect, it, vi } from 'vitest';
import { readIntentQuotaFromState } from '../frontend/src/utils/intent-quota-client';

describe('readIntentQuotaFromState', () => {
  it('derives remaining from granted minus consumed', () => {
    const q = readIntentQuotaFromState(
      { intentQuotaGranted: 10, intentQuotaConsumed: 3, intentQuotaRemaining: 999 },
      { granted: 10, consumed: 0, remaining: 10 }
    );
    expect(q).toEqual({ granted: 10, consumed: 3, remaining: 7 });
  });

  it('uses fallback when state fields missing', () => {
    const q = readIntentQuotaFromState({}, { granted: 10, consumed: 2, remaining: 8 });
    expect(q).toEqual({ granted: 10, consumed: 2, remaining: 8 });
  });

  it('warns when server remaining disagrees with derived', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    readIntentQuotaFromState(
      { intentQuotaGranted: 10, intentQuotaConsumed: 1, intentQuotaRemaining: 10 },
      { granted: 10, consumed: 0, remaining: 10 }
    );
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it('returns fallback when state undefined', () => {
    const fb = { granted: 10, consumed: 1, remaining: 9 };
    expect(readIntentQuotaFromState(undefined, fb)).toEqual(fb);
  });
});
