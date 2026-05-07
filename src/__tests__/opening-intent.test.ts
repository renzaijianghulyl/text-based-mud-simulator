import { describe, expect, it } from 'vitest';
import {
  isOpeningRoundIntent,
  OPENING_ROUND_INTENT,
  OPENING_ROUND_MARKER,
  readScenarioOpeningNarration,
  readScenarioOpeningPlayerHint,
} from '../engine/opening-intent';

describe('opening-intent', () => {
  it('OPENING_ROUND_INTENT 应以标记开头且可被识别', () => {
    expect(OPENING_ROUND_INTENT.startsWith(OPENING_ROUND_MARKER)).toBe(true);
    expect(isOpeningRoundIntent(OPENING_ROUND_INTENT)).toBe(true);
    expect(isOpeningRoundIntent(`  ${OPENING_ROUND_INTENT}`)).toBe(true);
    expect(isOpeningRoundIntent('上前搭话')).toBe(false);
  });

  it('readScenarioOpeningNarration 应读出虎牢关 config 开场句', () => {
    const t = readScenarioOpeningNarration('hulaguan');
    expect(t).toBeDefined();
    expect(t).toContain('初平');
  });

  it('readScenarioOpeningPlayerHint 应读出虎牢关 config 首局情境锚点', () => {
    const t = readScenarioOpeningPlayerHint('hulaguan');
    expect(t).toBeDefined();
    expect(t).toContain('联军');
  });
});
