import { describe, it, expect, vi } from 'vitest';
import { buildDemoSession } from '../sessions/session-manager';

describe('engine.process branches', () => {
  it('空意图会直接失败', async () => {
    const { process } = await import('../engine/engine');
    const session = buildDemoSession('u-empty', 'hulaguan');
    await expect(process(session, '   ')).rejects.toThrow('意图不能为空');
  });

  it('解析失败后会重试一次并成功', async () => {
    vi.resetModules();
    vi.doMock('../engine/llm-adapter', () => ({
      callLLM: vi
        .fn()
        .mockResolvedValueOnce('bad-json')
        .mockResolvedValueOnce(
          JSON.stringify({
            scenes: [
              { type: 'narration', content: '重试成功' },
              { type: 'dialogue', speaker: '吕布', content: '再来！' },
            ],
            stateChanges: { hp: -1, relationship: -1 },
          })
        ),
    }));

    const { process } = await import('../engine/engine');
    const session = buildDemoSession('u-retry', 'hulaguan');
    const res = await process(session, '试探');
    expect(res.narration).toBe('重试成功\n\n再来！');
    expect(res.dialogue).toBe('吕布：再来！');
    expect(res.state.history.length).toBe(1);
    vi.doUnmock('../engine/llm-adapter');
  });

  it('重试后仍失败会返回生成失败', async () => {
    vi.resetModules();
    vi.doMock('../engine/llm-adapter', () => ({
      callLLM: vi.fn().mockResolvedValue('still-bad-json'),
    }));

    const { process } = await import('../engine/engine');
    const session = buildDemoSession('u-fail', 'hulaguan');
    await expect(process(session, '试探')).rejects.toThrow('生成失败，请重试');
    vi.doUnmock('../engine/llm-adapter');
  });
});
