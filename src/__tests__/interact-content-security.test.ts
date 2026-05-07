import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const FAKE_OPENID = 'oUserOpenId_for_test';

const { fakeDb, msgSecCheckMock, callLLMMock } = vi.hoisted(() => ({
  fakeDb: { store: new Map<string, Record<string, unknown>>() },
  msgSecCheckMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
  callLLMMock: vi.fn<(...args: unknown[]) => Promise<string>>(),
}));

vi.mock('wx-server-sdk', () => {
  function makeCollection(name: string) {
    void name;
    return {
      doc(id: string) {
        return {
          async get() {
            const raw = fakeDb.store.get(id);
            return { data: raw };
          },
          async set(opts: { data: Record<string, unknown> }) {
            fakeDb.store.set(id, opts.data);
            return { stats: { updated: 1 } };
          },
          async remove() {
            const had = fakeDb.store.has(id);
            fakeDb.store.delete(id);
            return { stats: { removed: had ? 1 : 0 } };
          },
        };
      },
      where(condition: Record<string, unknown>) {
        const sid = condition.sessionId as string | undefined;
        return {
          limit(_n: number) {
            void _n;
            return {
              async get() {
                if (!sid) return { data: [] };
                const raw = fakeDb.store.get(sid);
                return { data: raw ? [raw] : [] };
              },
            };
          },
          async remove() {
            if (sid) fakeDb.store.delete(sid);
            return { stats: { removed: 1 } };
          },
        };
      },
      async add(opts: { data: Record<string, unknown> }) {
        const id = String(opts.data._id ?? `auto_${fakeDb.store.size}`);
        fakeDb.store.set(id, { ...opts.data, _id: id });
        return { _id: id };
      },
    };
  }
  const sdk = {
    DYNAMIC_CURRENT_ENV: Symbol('DYNAMIC_CURRENT_ENV'),
    init: vi.fn(),
    getWXContext: vi.fn(() => ({ OPENID: FAKE_OPENID })),
    database: vi.fn(() => ({ collection: makeCollection })),
    openapi: {
      security: {
        msgSecCheck: msgSecCheckMock,
      },
    },
  };
  return {
    default: sdk,
    ...sdk,
  };
});

vi.mock('../engine/llm-adapter', () => ({
  callLLM: callLLMMock,
}));

import { main } from '../functions/interact/index';

const VALID_LLM_RESPONSE = JSON.stringify({
  scenes: [
    { type: 'narration', content: '你与吕布在虎牢关前对峙。' },
    { type: 'dialogue', speaker: '吕布', content: '何人敢当我一戟？' },
  ],
  stateChanges: { hp: -5, relationship: -10, reason: '言语挑衅' },
});

beforeEach(() => {
  fakeDb.store.clear();
  msgSecCheckMock.mockReset();
  callLLMMock.mockReset();
  delete process.env.CONTENT_SECURITY_ENABLED;
});

afterEach(() => {
  fakeDb.store.clear();
});

describe('interact main + content security', () => {
  it('UGC intent 命中违规：不调用 LLM、不写库、不消耗配额', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'risky' } });

    fakeDb.store.set(`${FAKE_OPENID}_hulaguan`, {
      _id: `${FAKE_OPENID}_hulaguan`,
      sessionId: `${FAKE_OPENID}_hulaguan`,
      userId: FAKE_OPENID,
      scenarioId: 'hulaguan',
      npcs: { current: { id: 'lv-bu', name: '吕布', personality: '高傲', motivation: '称雄', relationship: 0 } },
      relationships: { 'lv-bu': 0 },
      player: { hp: 100, maxHp: 100 },
      recentSummaryLines: [],
      recentPhrases: [],
      keyEvents: [],
      cumulativeState: { totalRounds: 0, hp: 100, maxHp: 100 },
      history: [],
      currentRound: 1,
      intentQuotaGranted: 10,
      intentQuotaConsumed: 0,
      intentQuotaShareClaims: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await main({ scenarioId: 'hulaguan', intent: '违规输入' }, undefined);
    expect(res.success).toBe(false);
    expect(res.code).toBe('CONTENT_RISK_USER');
    expect(callLLMMock).not.toHaveBeenCalled();

    const stored = fakeDb.store.get(`${FAKE_OPENID}_hulaguan`) as Record<string, unknown>;
    expect(stored.intentQuotaConsumed).toBe(0);
  });

  it('LLM 输出命中违规：不消耗配额、不写库（配额仍为 0）', async () => {
    msgSecCheckMock
      .mockResolvedValueOnce({ errCode: 0, result: { suggest: 'pass' } })
      .mockResolvedValueOnce({ errCode: 0, result: { suggest: 'risky' } });
    callLLMMock.mockResolvedValue(VALID_LLM_RESPONSE);

    fakeDb.store.set(`${FAKE_OPENID}_hulaguan`, {
      _id: `${FAKE_OPENID}_hulaguan`,
      sessionId: `${FAKE_OPENID}_hulaguan`,
      userId: FAKE_OPENID,
      scenarioId: 'hulaguan',
      npcs: { current: { id: 'lv-bu', name: '吕布', personality: '高傲', motivation: '称雄', relationship: 0 } },
      relationships: { 'lv-bu': 0 },
      player: { hp: 100, maxHp: 100 },
      recentSummaryLines: [],
      recentPhrases: [],
      keyEvents: [],
      cumulativeState: { totalRounds: 0, hp: 100, maxHp: 100 },
      history: [],
      currentRound: 1,
      intentQuotaGranted: 10,
      intentQuotaConsumed: 0,
      intentQuotaShareClaims: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await main({ scenarioId: 'hulaguan', intent: '试探吕布' }, undefined);
    expect(res.success).toBe(false);
    expect(res.code).toBe('CONTENT_RISK_AI');
    expect(callLLMMock).toHaveBeenCalledTimes(1);

    const stored = fakeDb.store.get(`${FAKE_OPENID}_hulaguan`) as Record<string, unknown>;
    expect(stored.intentQuotaConsumed).toBe(0);
    expect((stored.player as Record<string, unknown>).hp).toBe(100);
    expect(stored.history).toEqual([]);
  });

  it('msgSecCheck 接口失败 → CONTENT_CHECK_UNAVAILABLE，且不进 LLM', async () => {
    msgSecCheckMock.mockRejectedValue(new Error('access_token expired'));
    callLLMMock.mockResolvedValue(VALID_LLM_RESPONSE);

    fakeDb.store.set(`${FAKE_OPENID}_hulaguan`, {
      _id: `${FAKE_OPENID}_hulaguan`,
      sessionId: `${FAKE_OPENID}_hulaguan`,
      userId: FAKE_OPENID,
      scenarioId: 'hulaguan',
      npcs: { current: { id: 'lv-bu', name: '吕布', personality: '高傲', motivation: '称雄', relationship: 0 } },
      relationships: { 'lv-bu': 0 },
      player: { hp: 100, maxHp: 100 },
      recentSummaryLines: [],
      recentPhrases: [],
      keyEvents: [],
      cumulativeState: { totalRounds: 0, hp: 100, maxHp: 100 },
      history: [],
      currentRound: 1,
      intentQuotaGranted: 10,
      intentQuotaConsumed: 0,
      intentQuotaShareClaims: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await main({ scenarioId: 'hulaguan', intent: '正常输入' }, undefined);
    expect(res.success).toBe(false);
    expect(res.code).toBe('CONTENT_CHECK_UNAVAILABLE');
    expect(callLLMMock).not.toHaveBeenCalled();
  });

  it('正常通路：UGC + AI 都 pass，配额 +1，状态写库', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'pass' } });
    callLLMMock.mockResolvedValue(VALID_LLM_RESPONSE);

    fakeDb.store.set(`${FAKE_OPENID}_hulaguan`, {
      _id: `${FAKE_OPENID}_hulaguan`,
      sessionId: `${FAKE_OPENID}_hulaguan`,
      userId: FAKE_OPENID,
      scenarioId: 'hulaguan',
      npcs: { current: { id: 'lv-bu', name: '吕布', personality: '高傲', motivation: '称雄', relationship: 0 } },
      relationships: { 'lv-bu': 0 },
      player: { hp: 100, maxHp: 100 },
      recentSummaryLines: [],
      recentPhrases: [],
      keyEvents: [],
      cumulativeState: { totalRounds: 0, hp: 100, maxHp: 100 },
      history: [],
      currentRound: 1,
      intentQuotaGranted: 10,
      intentQuotaConsumed: 0,
      intentQuotaShareClaims: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const res = await main({ scenarioId: 'hulaguan', intent: '正常输入' }, undefined);
    expect(res.success).toBe(true);
    expect(res.code).toBe('OK');

    const stored = fakeDb.store.get(`${FAKE_OPENID}_hulaguan`) as Record<string, unknown>;
    expect(stored.intentQuotaConsumed).toBe(1);
    expect((stored.player as Record<string, unknown>).hp).toBe(95);
  });

  it('OC 玩家身份命中违规：不创建会话', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'risky' } });

    const res = await main(
      {
        scenarioId: 'hulaguan',
        isNew: true,
        playerRoleProfile: { mode: 'oc', name: '违规姓名', background: '违规背景' },
      },
      undefined
    );
    expect(res.success).toBe(false);
    expect(res.code).toBe('CONTENT_RISK_USER');
    expect(fakeDb.store.has(`${FAKE_OPENID}_hulaguan`)).toBe(false);
    expect(callLLMMock).not.toHaveBeenCalled();
  });
});
