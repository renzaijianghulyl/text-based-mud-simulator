import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPrompt } from '../engine/prompt-builder';
import { parseResponse, validateParse } from '../engine/response-parser';
import { isKeyEvent, updateMemory } from '../engine/memory-manager';
import { callLLM } from '../engine/llm-adapter';
import { logEngine } from '../engine/logger';
import { buildDemoSession } from '../sessions/session-manager';

describe('engine unit', () => {
  const envBackup = { ...process.env };

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env = { ...envBackup };
  });

  afterEach(() => {
    process.env = { ...envBackup };
  });

  it('buildPrompt 应包含关键注入段落', () => {
    const prompt = buildPrompt(
      {
        current: {
          id: 'lv-bu',
          name: '吕布',
          personality: '高傲、易怒、但爱才',
          motivation: '证明武力',
          relationship: -40,
        },
      },
      {
        recentSummaryLines: ['R1: 初见吕布', 'R2: 言语试探'],
        recentPhrases: [{ phrase: '冷哼', round: 2 }],
        keyEvents: [{ round: 2, event: '顶撞', impact: '关系下降' }],
        cumulativeState: {
          totalRounds: 2,
          hp: 90,
          maxHp: 100,
          status: '自由',
          environment: { time: '黄昏', weather: '风沙弥漫', location: '虎牢关前营帐' },
        },
      },
      '我想先示好，再探口风',
      'hulaguan'
    );

    expect(prompt).toContain('【剧本类型】');
    expect(prompt).toContain('战争类');
    expect(prompt).toContain('【系统指令】');
    expect(prompt).toContain('【NPC 人设】');
    expect(prompt).toContain('【关系状态】');
    expect(prompt).toContain('【关键事件】');
    expect(prompt).toContain('【滚动摘要（最近至多 3 轮）】');
    expect(prompt).toContain('【累计状态】');
    expect(prompt).toContain('【玩家意图】');
    expect(prompt).toContain('【输出格式（严格遵守）】');
    expect(prompt).toContain('【导演原则：生命、冲突与结局】');
    expect(prompt).toContain('【导演原则：叙事多样性（软性约束）】');
    expect(prompt).toContain('【导演原则：关系进展（软性约束）】');
    expect(prompt).toContain('【关系阶段与行为预设】');
    expect(prompt).toContain('【关系变化原则】');
    expect(prompt).toContain('【冒犯后回升节奏】');
    expect(prompt).toContain('【人设一致性优先】');
    expect(prompt).toContain('【导演原则：时间连贯性（软性约束）】');
    expect(prompt).toContain('【时间连贯自检】');
    expect(prompt).toContain('【导演原则：战斗多样性（软性约束）】');
    expect(prompt).toContain('【导演原则：NPC 情感层次（软性约束）】');
    expect(prompt).toContain('【导演原则：玩家成长（软性约束）】');
    expect(prompt).toContain('【导演原则：战役节奏（软性约束）】');
    expect(prompt).toContain('【战役节奏自检】');
    expect(prompt).toContain('【休整内容示例】');
    expect(prompt).toContain('【导演原则：NPC 深度情感（软性约束）】');
    expect(prompt).toContain('【NPC 深度情感自检】');
    expect(prompt).toContain('【导演原则：玩家角色弧光（软性约束）】');
    expect(prompt).toContain('【玩家弧光自检】');
    expect(prompt).toContain('【导演原则：悬念与主题（软性约束）】');
    expect(prompt).toContain('【悬念与主题自检】');
    expect(prompt).toContain('【导演原则：情感共鸣（软性约束）】');
    expect(prompt).toContain('【情感共鸣自检】');
    expect(prompt).toContain('【导演原则：剧情推进（软性约束）】');
    expect(prompt).toContain('【篇幅与信息密度（软性）】');
    expect(prompt).toContain('【时间流逝】');
    expect(prompt).toContain('【事件触发】');
    expect(prompt).toContain('【态度表达多样化】');
    expect(prompt).toContain('【环境记忆】');
    expect(prompt).toContain('【最近使用的表达】');
    expect(prompt).toContain('【感官多样性引导】');
    expect(prompt).toContain('【环境演进引导】');
    expect(prompt).toContain('【修辞手法建议】');
    expect(prompt).toContain('【导演的自我修养】');
    expect(prompt).toContain('（游戏结束）');
    expect(prompt).toContain('增量');
    expect(prompt).toContain('吕布');
    expect(prompt).toContain('我想先示好，再探口风');
  });

  it('buildPrompt 在总轮次较多时在累计状态注入长程叙事参考', () => {
    const prompt = buildPrompt(
      {
        current: {
          id: 'lv-bu',
          name: '吕布',
          personality: '高傲',
          motivation: '证明武力',
          relationship: 0,
        },
      },
      {
        recentSummaryLines: [],
        recentPhrases: [],
        keyEvents: [],
        cumulativeState: { totalRounds: 20, hp: 80, maxHp: 100 },
      },
      '继续',
      'hulaguan'
    );
    expect(prompt).toContain('叙事参考');
    expect(prompt).toMatch(/20/);
  });

  it('buildPrompt 在总轮次很高时在累计状态追加长程休整提示', () => {
    const prompt = buildPrompt(
      {
        current: {
          id: 'lv-bu',
          name: '吕布',
          personality: '高傲',
          motivation: '证明武力',
          relationship: 0,
        },
      },
      {
        recentSummaryLines: [],
        recentPhrases: [],
        keyEvents: [],
        cumulativeState: { totalRounds: 30, hp: 70, maxHp: 100 },
      },
      '继续',
      'hulaguan'
    );
    expect(prompt).toContain('长程：宜穿插休整、夜谈与军议');
  });

  it('parseResponse / validateParse 可解析标准 JSON', () => {
    const input = `{
      "narration":"虎牢关前战鼓震天",
      "dialogue":"吕布：来将通名！",
      "stateChanges":{"hp":-10,"relationship":-20,"reason":"触怒吕布"}
    }`;
    const parsed = parseResponse(input);
    expect(parsed.narration).toContain('虎牢关');
    expect(parsed.stateChanges.hp).toBe(-10);
    expect(validateParse(parsed)).toBe(true);
  });

  it('parseResponse 遇到非法结构会抛错', () => {
    const bad = '{"narration":"","dialogue":"ok","stateChanges":{"hp":"x","relationship":1}}';
    expect(() => parseResponse(bad)).toThrow();
  });

  it('updateMemory 保留最近 3 条滚动摘要并更新累计状态', () => {
    const session = buildDemoSession('u1', 'hulaguan');
    const response = {
      narration: '测试旁白',
      dialogue: '测试对话',
      stateChanges: { hp: -1, relationship: 2 },
    };

    updateMemory(session, '第一轮动作', response, response.stateChanges);
    updateMemory(session, '第二轮动作', response, response.stateChanges);
    updateMemory(session, '第三轮动作', response, response.stateChanges);
    updateMemory(session, '第四轮动作', response, response.stateChanges);

    expect(session.recentSummaryLines).toHaveLength(3);
    expect(session.recentSummaryLines[0]).toContain('第二轮动作');
    expect(session.cumulativeState.totalRounds).toBe(4);
    expect(session.currentRound).toBe(5);
    expect(session.history).toHaveLength(4);
  });

  it('updateMemory 会维护 environment 与 recentPhrases 窗口', () => {
    const session = buildDemoSession('u-env', 'hulaguan');
    const response = {
      narration: '夜色压城，风沙弥漫，吕布冷哼一声，目光如电。',
      dialogue: '吕布：哼，退后！',
      stateChanges: { hp: -5, relationship: -2 },
    };
    updateMemory(session, '我在营帐前挑衅', response, response.stateChanges);

    expect(session.cumulativeState.environment?.time).toBe('夜晚');
    expect(session.cumulativeState.environment?.weather).toBe('风沙弥漫');
    expect(session.cumulativeState.environment?.location).toBe('虎牢关前营帐');
    expect(session.recentPhrases.length).toBeGreaterThan(0);
    expect(session.recentPhrases.length).toBeLessThanOrEqual(3);
  });

  it('isKeyEvent 阈值与关键词检测正确', () => {
    expect(isKeyEvent({ hp: 0, relationship: 51 }, '观察')).toBe(true);
    expect(isKeyEvent({ hp: -31, relationship: 0 }, '观察')).toBe(true);
    expect(isKeyEvent({ hp: 0, relationship: 0 }, '我要投降')).toBe(true);
    expect(isKeyEvent({ hp: 0, relationship: 10 }, '普通寒暄')).toBe(false);
  });

  it('callLLM 可成功调用主模型接口', async () => {
    process.env.LLM_API_KEY = 'k-primary';
    process.env.LLM_API_URL = 'https://example.com/chat';
    process.env.LLM_MODEL_PRIMARY = 'qwen3.5-plus';

    const fetchMock = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: '好' } }],
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    );
    vi.stubGlobal('fetch', fetchMock);

    const out = await callLLM('只回复一个字');
    expect(out).toBe('好');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, req] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://example.com/chat');
    expect(req.method).toBe('POST');
  });

  it('callLLM 主模型失败后会切换 DeepSeek', async () => {
    process.env.LLM_API_KEY = 'k-primary';
    process.env.LLM_API_URL = 'https://primary.example/chat';
    process.env.LLM_MODEL_PRIMARY = 'qwen3.5-plus';
    process.env.DEEPSEEK_API_KEY = 'k-fallback';
    process.env.DEEPSEEK_API_URL = 'https://fallback.example/chat';
    process.env.LLM_MODEL_FALLBACK = 'deepseek-chat';

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'boom-1' } }), { status: 500 })
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: { message: 'boom-2' } }), { status: 500 })
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ choices: [{ message: { content: 'fallback-ok' } }] }),
          { status: 200 }
        )
      );
    vi.stubGlobal('fetch', fetchMock);

    const out = await callLLM('测试回退');
    expect(out).toBe('fallback-ok');
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const thirdCall = fetchMock.mock.calls[2] as [string, RequestInit];
    expect(thirdCall[0]).toBe('https://fallback.example/chat');
  });

  it('callLLM 缺少 LLM_API_KEY 时抛配置错误', async () => {
    delete process.env.LLM_API_KEY;
    await expect(callLLM('x')).rejects.toThrow('未配置 LLM_API_KEY');
  });

  it('callLLM 主模型失败且无备选 key 时抛错', async () => {
    process.env.LLM_API_KEY = 'k-primary';
    delete process.env.DEEPSEEK_API_KEY;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'x' } }), { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(callLLM('x')).rejects.toThrow('主模型调用失败且未配置 DEEPSEEK_API_KEY');
  });

  it('callLLM 处理非 JSON 响应', async () => {
    process.env.LLM_API_KEY = 'k-primary';
    const fetchMock = vi.fn(async () => new Response('not-json', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(callLLM('x')).rejects.toThrow();
  });

  it('callLLM 处理空 content 响应', async () => {
    process.env.LLM_API_KEY = 'k-primary';
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ choices: [{ message: { content: '' } }] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    await expect(callLLM('x')).rejects.toThrow();
  });

  it('buildPrompt 长文本会被截断', () => {
    const long = '甲'.repeat(2000);
    const prompt = buildPrompt(
      {
        current: {
          id: 'lv-bu',
          name: '吕布',
          personality: long,
          motivation: 'x',
          relationship: -85,
        },
      },
      {
        recentSummaryLines: [long],
        recentPhrases: [],
        keyEvents: [{ round: 1, event: long, impact: long }],
        cumulativeState: { totalRounds: 1, hp: 100, maxHp: 100 },
      },
      long,
      'hulaguan'
    );
    expect(prompt).toContain('…');
  });

  it('parseResponse 对无 JSON 文本抛错', () => {
    expect(() => parseResponse('这是一段纯文本')).toThrow('未在输出中找到 JSON 对象');
  });

  it('parseResponse 对非对象根节点抛错', () => {
    expect(() => parseResponse('[]')).toThrow();
  });

  it('parseResponse 对 stateChanges 非对象抛错', () => {
    expect(() =>
      parseResponse('{"narration":"n","dialogue":"d","stateChanges":1}')
    ).toThrow('stateChanges 必须为对象');
  });

  it('parseResponse 容忍前后说明与 markdown 代码围栏', () => {
    const input = `好的，这是本轮结果：
\`\`\`json
{"narration":"关前风起","dialogue":"吕布：来！","stateChanges":{"hp":"-5","relationship":-3}}
\`\`\`
以上。`;
    const parsed = parseResponse(input);
    expect(parsed.narration).toContain('关前');
    expect(parsed.stateChanges.hp).toBe(-5);
    expect(validateParse(parsed)).toBe(true);
  });

  it('parseResponse 容忍 stateChanges 为 JSON 字符串与尾随逗号', () => {
    const input = JSON.stringify({
      narration: 'n1',
      dialogue: 'd1',
      stateChanges: '{"hp": -1, "relationship": 2, }',
    });
    const parsed = parseResponse(input);
    expect(parsed.stateChanges.hp).toBe(-1);
    expect(parsed.stateChanges.relationship).toBe(2);
  });

  it('parseResponse 容忍 stateChanges 为仅含一个对象的数组', () => {
    const input = JSON.stringify({
      narration: 'n2',
      dialogue: 'd2',
      stateChanges: [{ hp: 0, relationship: 1 }],
    });
    const parsed = parseResponse(input);
    expect(parsed.stateChanges.hp).toBe(0);
    expect(parsed.stateChanges.relationship).toBe(1);
  });

  it('isKeyEvent 支持 HP 正向阈值分支', () => {
    expect(isKeyEvent({ hp: 31, relationship: 0 }, '治疗')).toBe(true);
  });

  it('updateMemory 在关键事件时会写入 keyEvents 与 impact', () => {
    const session = buildDemoSession('u-key', 'hulaguan');
    const response = {
      narration: '旁白',
      dialogue: '对话',
      stateChanges: { hp: -40, relationship: 0, reason: '重伤' },
    };
    updateMemory(session, '刺杀吕布', response, response.stateChanges);
    expect(session.keyEvents).toHaveLength(1);
    expect(session.keyEvents[0].impact).toContain('HP 变化 -40');
    expect(session.keyEvents[0].impact).toContain('重伤');
  });

  it.each([
    { rel: 90, label: '生死之交' },
    { rel: 55, label: '好友' },
    { rel: 25, label: '友善' },
    { rel: 0, label: '陌生' },
    { rel: -30, label: '冷淡' },
    { rel: -60, label: '敌对' },
    { rel: -90, label: '死敌' },
  ])('buildPrompt 会映射关系标签: $label', ({ rel, label }) => {
    const prompt = buildPrompt(
      {
        current: {
          id: 'x',
          name: '测试NPC',
          personality: '测试',
          motivation: 'm',
          relationship: rel,
        },
      },
      {
        recentSummaryLines: [],
        recentPhrases: [],
        keyEvents: [],
        cumulativeState: { totalRounds: 1, hp: 100, maxHp: 100 },
      },
      '测试意图',
      'hulaguan'
    );
    expect(prompt).toContain(label);
  });

  it('logEngine 可覆盖不同日志分支', () => {
    const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    logEngine('info', 's', 'm');
    logEngine('warn', 's', 'm');
    logEngine('error', 's', 'm', { cause: 'x' });
    expect(logSpy).toHaveBeenCalled();
    expect(warnSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalled();
    logSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });
});
