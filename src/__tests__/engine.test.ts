import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildPrompt } from '../engine/prompt-builder';
import {
  buildDramaticRelationshipsHint,
  buildHistoricalContextHint,
  buildRelationshipHint,
  collectAddressWarnings,
  collectHistoricalWarnings,
} from '../engine/historical-context';
import {
  buildEnsembleBeatsHint,
  buildScenarioEmotionalHint,
  shouldSuppressEmotionalBeat,
} from '../engine/scenario-emotional-hint';
import {
  getEnsembleElasticPromptLine,
  getScenarioEnsembleHint,
} from '../engine/scenario-ensemble-hint';
import { parseResponse, validateParse } from '../engine/response-parser';
import { isKeyEvent, updateMemory } from '../engine/memory-manager';
import { callLLM } from '../engine/llm-adapter';
import { logEngine } from '../engine/logger';
import { buildDemoSession } from '../sessions/session-manager';
import { resolvePromptProfile } from '../engine/engine';
import { OPENING_ROUND_INTENT, OPENING_ROUND_MARKER } from '../engine/opening-intent';

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
    expect(prompt).toContain('【历史背景与约束】');
    expect(prompt).toContain('【情感高潮引导】');
    expect(prompt).toContain('初平元年');
    expect(prompt).toContain('许都');
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
    expect(prompt).toContain('【导演原则：群像与点名（强倾向）】');
    expect(prompt).toContain('【卡司与点名】');
    expect(prompt).toContain('【本剧本可出现台词的 NPC】');
    expect(prompt).toContain('奉先');
    expect(prompt).toContain('【群像与轮次弹性】');
    expect(prompt).toContain('禁止「代答」');
    const optionalDirectors = [
      '【导演原则：战斗多样性（软性约束）】',
      '【导演原则：NPC 情感层次（软性约束）】',
      '【导演原则：玩家成长（软性约束）】',
      '【导演原则：战役节奏（软性约束）】',
      '【导演原则：NPC 深度情感（软性约束）】',
      '【导演原则：玩家角色弧光（软性约束）】',
      '【导演原则：悬念与主题（软性约束）】',
      '【导演原则：情感共鸣（软性约束）】',
      '【导演原则：剧情推进（软性约束）】',
    ];
    expect(optionalDirectors.some((x) => prompt.includes(x))).toBe(true);
    expect(prompt).toContain('【环境记忆】');
    expect(prompt).toContain('【最近使用的表达】');
    expect(prompt).toContain('【感官多样性引导】');
    expect(prompt).toContain('【环境演进引导】');
    expect(prompt).toContain('【修辞手法建议】');
    expect(prompt).toContain('【导演的自我修养】');
    expect(prompt).toContain('【篇幅与信息密度（软性）】');
    expect(prompt).toContain('军帐/军令类');
    expect(prompt).toContain('避免整幕仅一两句带过');
    expect(prompt).toContain('（游戏结束）');
    expect(prompt).toContain('增量');
    expect(prompt).toContain('吕布');
    expect(prompt).toContain('我想先示好，再探口风');
  });

  it('buildPrompt 在开局意图时应包含剧本开场参考与开局导演', () => {
    const prompt = buildPrompt(
      {
        current: {
          id: 'lv-bu',
          name: '吕布',
          personality: '高傲',
          motivation: '武力',
          relationship: 0,
        },
      },
      {
        recentSummaryLines: [],
        recentPhrases: [],
        keyEvents: [],
        cumulativeState: {
          totalRounds: 0,
          hp: 100,
          maxHp: 100,
          status: '自由',
          environment: { time: '清晨', weather: '风沙', location: '虎牢关' },
        },
      },
      OPENING_ROUND_INTENT,
      'hulaguan'
    );
    expect(prompt).toContain('【开局旁白导演】');
    expect(prompt).toContain('【剧本开场参考】');
    expect(prompt).toContain('【首局情境提示】');
    expect(prompt).toContain('联军');
    expect(prompt).toContain('初平');
    expect(prompt).toContain(OPENING_ROUND_MARKER);
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

  it('resolvePromptProfile 能根据关键词与上下文选择档位', () => {
    expect(resolvePromptProfile('你好', { relationship: 0, round: 1 })).toBe('fast');
    expect(resolvePromptProfile('我要与你决战到底', { relationship: 0, round: 3 })).toBe('rich');
    expect(resolvePromptProfile('我们继续推进', { relationship: 10, round: 4 })).toBe('fast');
    expect(resolvePromptProfile('我先示好再试探他的底线', { relationship: 10, round: 5 })).toBe('balanced');
    expect(resolvePromptProfile('一起商议后续安排并表态', { relationship: 60, round: 8 })).toBe('balanced');
    expect(resolvePromptProfile('我愿忠心追随主公', { relationship: 65, round: 12 })).toBe('rich');
    expect(resolvePromptProfile('投降', { relationship: 0, round: 1 })).toBe('rich');
    expect(resolvePromptProfile('誓死追随', { relationship: 0, round: 1 })).toBe('rich');
    expect(resolvePromptProfile('嗯', { relationship: 0, round: 1 })).toBe('fast');
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
      "scenes":[
        {"type":"narration","content":"虎牢关前战鼓震天"},
        {"type":"dialogue","speaker":"吕布","content":"来将通名！"}
      ],
      "stateChanges":{"hp":-10,"relationship":-20,"reason":"触怒吕布"}
    }`;
    const parsed = parseResponse(input);
    expect(parsed.narration).toContain('虎牢关');
    expect(parsed.stateChanges.hp).toBe(-10);
    expect(validateParse(parsed)).toBe(true);
  });

  it('parseResponse 遇到非法结构会抛错', () => {
    const bad = '{"scenes":[{"type":"dialogue","speaker":"吕布","content":"来战"}],"stateChanges":{"hp":"x","relationship":1}}';
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
    process.env.PRIMARY_LLM_API_KEY = 'k-primary';
    process.env.PRIMARY_LLM_API_URL = 'https://example.com/chat';
    process.env.PRIMARY_LLM_MODEL = 'qwen3.5-plus';

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
    process.env.PRIMARY_LLM_API_KEY = 'k-primary';
    process.env.PRIMARY_LLM_API_URL = 'https://primary.example/chat';
    process.env.PRIMARY_LLM_MODEL = 'qwen3.5-plus';
    process.env.FALLBACK_LLM_API_KEY = 'k-fallback';
    process.env.FALLBACK_LLM_API_URL = 'https://fallback.example/chat';
    process.env.FALLBACK_LLM_MODEL = 'deepseek-chat';

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

  it('callLLM 缺少 PRIMARY_LLM_API_KEY 时抛配置错误', async () => {
    delete process.env.PRIMARY_LLM_API_KEY;
    delete process.env.LLM_API_KEY;
    await expect(callLLM('x')).rejects.toThrow('未配置 PRIMARY_LLM_API_KEY');
  });

  it('callLLM 主模型失败且无备选 key 时抛错', async () => {
    process.env.PRIMARY_LLM_API_KEY = 'k-primary';
    delete process.env.FALLBACK_LLM_API_KEY;
    delete process.env.DEEPSEEK_API_KEY;
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'x' } }), { status: 500 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(callLLM('x')).rejects.toThrow('主模型调用失败且未配置 FALLBACK_LLM_API_KEY');
  });

  it('callLLM 处理非 JSON 响应', async () => {
    process.env.PRIMARY_LLM_API_KEY = 'k-primary';
    const fetchMock = vi.fn(async () => new Response('not-json', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await expect(callLLM('x')).rejects.toThrow();
  });

  it('callLLM 处理空 content 响应', async () => {
    process.env.PRIMARY_LLM_API_KEY = 'k-primary';
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
      parseResponse('{"scenes":[{"type":"narration","content":"n"},{"type":"dialogue","speaker":"吕布","content":"d"}],"stateChanges":1}')
    ).toThrow('stateChanges 必须为对象');
  });

  it('parseResponse 容忍前后说明与 markdown 代码围栏', () => {
    const input = `好的，这是本轮结果：
\`\`\`json
{"scenes":[{"type":"narration","content":"关前风起"},{"type":"dialogue","speaker":"吕布","content":"来！"}],"stateChanges":{"hp":"-5","relationship":-3}}
\`\`\`
以上。`;
    const parsed = parseResponse(input);
    expect(parsed.narration).toContain('关前');
    expect(parsed.stateChanges.hp).toBe(-5);
    expect(validateParse(parsed)).toBe(true);
  });

  it('parseResponse 容忍 stateChanges 为 JSON 字符串与尾随逗号', () => {
    const input = JSON.stringify({
      scenes: [
        { type: 'narration', content: 'n1' },
        { type: 'dialogue', speaker: '吕布', content: 'd1' },
      ],
      stateChanges: '{"hp": -1, "relationship": 2, }',
    });
    const parsed = parseResponse(input);
    expect(parsed.stateChanges.hp).toBe(-1);
    expect(parsed.stateChanges.relationship).toBe(2);
  });

  it('parseResponse 容忍 stateChanges 为仅含一个对象的数组', () => {
    const input = JSON.stringify({
      scenes: [
        { type: 'narration', content: 'n2' },
        { type: 'dialogue', speaker: '吕布', content: 'd2' },
      ],
      stateChanges: [{ hp: 0, relationship: 1 }],
    });
    const parsed = parseResponse(input);
    expect(parsed.stateChanges.hp).toBe(0);
    expect(parsed.stateChanges.relationship).toBe(1);
  });

  it('isKeyEvent 支持 HP 正向阈值分支', () => {
    expect(isKeyEvent({ hp: 31, relationship: 0 }, '治疗')).toBe(true);
  });

  it('parseResponse 会保留 scenes 并派生 narration/dialogue', () => {
    const parsed = parseResponse(
      JSON.stringify({
        scenes: [
          { type: 'narration', content: '风沙卷地。' },
          { type: 'action', content: '你提刀上前。' },
          { type: 'dialogue', speaker: '你', content: '受死！' },
          { type: 'dialogue', speaker: '吕布', content: '放马过来。' },
        ],
        stateChanges: { hp: -5, relationship: -6 },
      })
    );
    expect(parsed.scenes).toHaveLength(4);
    expect(parsed.narration).toContain('风沙卷地');
    expect(parsed.narration).toContain('你提刀上前');
    expect(parsed.dialogue).toContain('吕布：放马过来');
    expect(parsed.dialogue).not.toContain('你：受死');
  });

  it('parseResponse 允许仅有 narration/action（派生 dialogue 为空）且 validateParse 通过', () => {
    const parsed = parseResponse(
      JSON.stringify({
        scenes: [
          { type: 'narration', content: '虎牢关前风沙微起，营帐未启。' },
          { type: 'action', content: '远处传来马蹄声。' },
        ],
        stateChanges: { hp: 0, relationship: 0 },
      })
    );
    expect(parsed.dialogue).toBe('');
    expect(parsed.narration.length).toBeGreaterThan(0);
    expect(validateParse(parsed)).toBe(true);
  });

  it('parseResponse 在 scenes 缺失时抛错', () => {
    expect(() =>
      parseResponse(JSON.stringify({ narration: 'n', dialogue: 'd', stateChanges: { hp: 0, relationship: 0 } }))
    ).toThrow('scenes 必须为非空数组');
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

  it('buildHistoricalContextHint 对 hulaguan 非空且含时间锚', () => {
    const hint = buildHistoricalContextHint('hulaguan');
    expect(hint.length).toBeGreaterThan(0);
    expect(hint).toContain('初平元年');
    expect(hint).toContain('190');
  });

  it('buildHistoricalContextHint 对无配置剧本返回空串', () => {
    expect(buildHistoricalContextHint('__no_such_scenario__')).toBe('');
  });

  it('buildRelationshipHint 对曹操视角输出称谓约束', () => {
    const hint = buildRelationshipHint('hulaguan', 'cao-cao');
    expect(hint).toContain('对人关系');
    expect(hint).toContain('guo-jia');
    expect(hint).toContain('禁称');
    expect(hint).toContain('奉孝');
  });

  it('buildPrompt 在曹操视角注入人物关系与称谓段', () => {
    const prompt = buildPrompt(
      {
        current: {
          id: 'cao-cao',
          name: '曹操',
          personality: '多疑、爱才、有谋略',
          motivation: '讨董兴汉',
          relationship: 10,
        },
      },
      {
        recentSummaryLines: [],
        recentPhrases: [],
        keyEvents: [],
        cumulativeState: { totalRounds: 1, hp: 100, maxHp: 100 },
      },
      '我询问郭嘉近况',
      'hulaguan'
    );
    expect(prompt).toContain('【人物关系与称谓】');
    expect(prompt).toContain('建议称谓');
    expect(prompt).toContain('guo-jia');
    expect(prompt).toContain('【情感高潮引导】');
  });

  it('buildScenarioEmotionalHint 对 hulaguan 非空并包含强度建议', () => {
    const hint = buildScenarioEmotionalHint('hulaguan', 12, ['R11: 战后营中沉寂']);
    expect(hint.length).toBeGreaterThan(0);
    expect(hint).toContain('强度上限');
    expect(hint).toContain('候选模板');
  });

  it('buildScenarioEmotionalHint 对无配置剧本返回空串', () => {
    expect(buildScenarioEmotionalHint('__no_such_scenario__', 8, [])).toBe('');
  });

  it('buildScenarioEmotionalHint 前 10 轮不出现 high 强度', () => {
    const hint = buildScenarioEmotionalHint('hulaguan', 8, ['R7: 夜深值守']);
    expect(hint).toContain('强度上限：low');
    expect(hint).not.toContain('强度上限：high');
  });

  it('collectHistoricalWarnings 命中禁地', () => {
    const w = collectHistoricalWarnings('hulaguan', {
      narration: '曹操在许都运筹帷幄。',
      dialogue: '',
      stateChanges: { hp: 0, relationship: 0 },
      scenes: [{ type: 'narration', content: '曹操在许都运筹帷幄。' }],
    });
    expect(w.some((x) => x.includes('许都'))).toBe(true);
  });

  it('collectHistoricalWarnings 命中硬性事件关键词', () => {
    const w = collectHistoricalWarnings('hulaguan', {
      narration: '今日论十胜十败。',
      dialogue: '',
      stateChanges: { hp: 0, relationship: 0 },
      scenes: [{ type: 'narration', content: '今日论十胜十败。' }],
    });
    expect(w.some((x) => x.includes('十胜十败'))).toBe(true);
  });

  it('collectHistoricalWarnings 对缺席人物 dialogue speaker 告警', () => {
    const w = collectHistoricalWarnings('hulaguan', {
      narration: '帐中议事。',
      dialogue: '',
      stateChanges: { hp: 0, relationship: 0 },
      scenes: [
        { type: 'narration', content: '帐中议事。' },
        { type: 'dialogue', speaker: '郭嘉', content: '主公，臣有一计。' },
      ],
    });
    expect(w.some((x) => x.includes('郭嘉'))).toBe(true);
  });

  it('collectHistoricalWarnings 不因荀彧 dialogue 告警（forbidDialogueSpeaker false）', () => {
    const w = collectHistoricalWarnings('hulaguan', {
      narration: '',
      dialogue: '',
      stateChanges: { hp: 0, relationship: 0 },
      scenes: [{ type: 'dialogue', speaker: '荀彧', content: '后方粮道当慎。' }],
    });
    expect(w.some((x) => x.includes('荀彧'))).toBe(false);
  });

  it('collectAddressWarnings 命中主 NPC 直接禁称谓', () => {
    const w = collectAddressWarnings(
      'hulaguan',
      'cao-cao',
      '曹操',
      {
        narration: '',
        dialogue: '曹操：奉孝，汝可有定策？',
        stateChanges: { hp: 0, relationship: 0 },
        scenes: [{ type: 'dialogue', speaker: '曹操', content: '奉孝，汝可有定策？' }],
      }
    );
    expect(w.some((x) => x.includes('奉孝'))).toBe(true);
  });

  it('collectAddressWarnings 放行引用/纠偏语境', () => {
    const quoted = collectAddressWarnings(
      'hulaguan',
      'cao-cao',
      '曹操',
      {
        narration: '',
        dialogue: '曹操：汝言奉孝，可是颍川郭嘉？',
        stateChanges: { hp: 0, relationship: 0 },
        scenes: [{ type: 'dialogue', speaker: '曹操', content: '汝言奉孝，可是颍川郭嘉？' }],
      }
    );
    expect(quoted.length).toBe(0);

    const explain = collectAddressWarnings(
      'hulaguan',
      'cao-cao',
      '曹操',
      {
        narration: '',
        dialogue: '曹操：世人称奉孝，然某未敢以字称之。',
        stateChanges: { hp: 0, relationship: 0 },
        scenes: [{ type: 'dialogue', speaker: '曹操', content: '世人称奉孝，然某未敢以字称之。' }],
      }
    );
    expect(explain.length).toBe(0);
  });

  it('shouldSuppressEmotionalBeat 在强冲突与群像密集语义下返回 true', () => {
    expect(
      shouldSuppressEmotionalBeat(16, ['R15: 军议争执，曹操袁绍刘备同席', 'R16: 准备出战围攻'])
    ).toBe(true);
  });

  it('shouldSuppressEmotionalBeat 在近期已触发情感戏时返回 true', () => {
    expect(shouldSuppressEmotionalBeat(10, ['R9: 夜深独处'], 9)).toBe(true);
  });

  it('shouldSuppressEmotionalBeat 在普通轮次返回 false', () => {
    expect(shouldSuppressEmotionalBeat(9, ['R8: 帐外风声渐息，巡营如常'])).toBe(false);
  });

  it('getScenarioEnsembleHint 拼装 hulaguan 卡司含别名', () => {
    const hint = getScenarioEnsembleHint('hulaguan');
    expect(hint.length).toBeGreaterThan(0);
    expect(hint).toContain('【本剧本可出现台词的 NPC】');
    expect(hint).toContain('吕布');
    expect(hint).toContain('奉先');
    expect(hint).toContain('曹操');
    expect(hint).toContain('孟德');
    expect(hint).toContain('孙坚');
    expect(hint).toContain('【卡司职能短注】');
    expect(hint).toContain('盟主');
  });

  it('buildDramaticRelationshipsHint 对曹操视角非空', () => {
    const hint = buildDramaticRelationshipsHint('hulaguan', 'cao-cao');
    expect(hint.length).toBeGreaterThan(0);
    expect(hint).toContain('yuan-shao');
    expect(hint).toContain('盟主');
  });

  it('buildEnsembleBeatsHint 在演义窗口轮次出现节拍名', () => {
    const hint = buildEnsembleBeatsHint('hulaguan', 15, ['R14: 联军大营军议']);
    expect(hint).toContain('群像节拍');
    expect(hint).toContain('温酒斩华雄');
  });

  it('buildEnsembleBeatsHint R10 含庆功宴 ensemble', () => {
    const hint = buildEnsembleBeatsHint('hulaguan', 10, ['R9: 联军小胜前锋']);
    expect(hint).toContain('庆功宴');
  });

  it('buildEnsembleBeatsHint R12 含军议与单挑', () => {
    const hint = buildEnsembleBeatsHint('hulaguan', 12, ['R11: 联军大营军议纷纷']);
    expect(hint).toContain('军议');
    expect(hint).toContain('单挑');
  });

  it('buildEnsembleBeatsHint R16 含孙坚破华雄正史向与建议出场 id', () => {
    const hint = buildEnsembleBeatsHint('hulaguan', 16, ['R15: 孙坚前锋接战']);
    expect(hint).toContain('孙坚破华雄');
    expect(hint).toContain('正史向参考');
    expect(hint).toContain('建议出场 id：sun-jian');
  });

  it('buildDramaticRelationshipsHint 刘备视角含公孙瓒', () => {
    const hint = buildDramaticRelationshipsHint('hulaguan', 'liu-bei');
    expect(hint).toContain('gongsun-zan');
    expect(hint).toContain('戏剧关系');
  });

  it('buildPrompt 曹操视角含联军戏剧关系与群像节拍段', () => {
    const prompt = buildPrompt(
      {
        current: {
          id: 'cao-cao',
          name: '曹操',
          personality: '多疑、爱才、有谋略',
          motivation: '讨董兴汉',
          relationship: 10,
        },
      },
      {
        recentSummaryLines: ['R14: 帐中军议纷纭'],
        recentPhrases: [],
        keyEvents: [],
        cumulativeState: { totalRounds: 15, hp: 100, maxHp: 100 },
      },
      '观诸侯气色',
      'hulaguan'
    );
    expect(prompt).toContain('【联军人物戏剧关系】');
    expect(prompt).toContain('【群像节拍】');
    expect(prompt).toContain('戏剧关系');
    expect(prompt).toContain('盟主');
  });

  it('getEnsembleElasticPromptLine 在纯寒暄摘要时不追加小节节奏提示', () => {
    const line = getEnsembleElasticPromptLine(4, ['R3: 帐中寒暄', 'R4: 原地休整']);
    expect(line).toContain('群像节奏');
    expect(line).toContain('寒暄');
    expect(line).not.toContain('约满一小节叙事节奏点');
  });

  it('getEnsembleElasticPromptLine 在非寒暄且总轮次为 4 的倍数时追加节奏提示', () => {
    const line = getEnsembleElasticPromptLine(4, ['R3: 军议纷纷', 'R4: 吕布叫阵']);
    expect(line).toContain('约满一小节叙事节奏点');
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
