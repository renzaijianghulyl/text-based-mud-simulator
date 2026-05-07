import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { msgSecCheckMock } = vi.hoisted(() => ({
  msgSecCheckMock: vi.fn<(...args: unknown[]) => Promise<unknown>>(),
}));

vi.mock('wx-server-sdk', () => {
  const sdk = {
    DYNAMIC_CURRENT_ENV: Symbol('DYNAMIC_CURRENT_ENV'),
    init: vi.fn(),
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

import { ContentCheckUnavailableError, ContentRiskError } from '../errors';
import {
  checkAiOutputText,
  checkText,
  flattenAiText,
  splitForCheck,
} from '../adapters/wechat/wx-content-security';

const FAKE_OPENID = 'oXyz123_test_openid';

beforeEach(() => {
  msgSecCheckMock.mockReset();
  delete process.env.CONTENT_SECURITY_ENABLED;
});

afterEach(() => {
  msgSecCheckMock.mockReset();
});

describe('splitForCheck', () => {
  it('returns single segment for short text', () => {
    expect(splitForCheck('短文本')).toEqual(['短文本']);
  });

  it('returns empty array for empty text', () => {
    expect(splitForCheck('')).toEqual([]);
  });

  it('splits long text within max length', () => {
    const text = 'a'.repeat(5000);
    const segs = splitForCheck(text, 2400);
    expect(segs.length).toBeGreaterThanOrEqual(2);
    for (const s of segs) expect(s.length).toBeLessThanOrEqual(2400);
    expect(segs.join('')).toEqual(text);
  });

  it('prefers newline boundary when available', () => {
    const longLine = 'a'.repeat(1500);
    const text = `${longLine}\n${'b'.repeat(1500)}`;
    const segs = splitForCheck(text, 2400);
    expect(segs[0].endsWith('\n')).toBe(true);
  });
});

describe('flattenAiText', () => {
  it('joins narration, dialogue and scenes content', () => {
    const text = flattenAiText({
      narration: '风云际会。',
      dialogue: '吕布：来战！',
      scenes: [
        { type: 'narration', content: '营前对峙。' },
        { type: 'dialogue', speaker: '吕布', content: '若有胆便来。' },
        { type: 'action', content: '   ' },
      ],
    });
    expect(text).toContain('风云际会。');
    expect(text).toContain('吕布：来战！');
    expect(text).toContain('营前对峙。');
    expect(text).toContain('吕布：若有胆便来。');
  });

  it('returns empty string when nothing meaningful', () => {
    expect(flattenAiText({})).toBe('');
  });
});

describe('checkText', () => {
  it('passes when msgSecCheck returns suggest=pass', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'pass' } });
    await expect(checkText('正常的输入内容', FAKE_OPENID, { kind: 'user' })).resolves.toBeUndefined();
    expect(msgSecCheckMock).toHaveBeenCalledTimes(1);
    const call = msgSecCheckMock.mock.calls[0][0] as Record<string, unknown>;
    expect(call.openid).toBe(FAKE_OPENID);
    expect(call.version).toBe(2);
    expect(call.scene).toBe(1);
    expect(call.content).toBe('正常的输入内容');
  });

  it('skips API call for empty / whitespace text', async () => {
    await checkText('', FAKE_OPENID);
    await checkText('   \n  ', FAKE_OPENID);
    expect(msgSecCheckMock).not.toHaveBeenCalled();
  });

  it('throws ContentCheckUnavailableError when openid missing (fail-closed)', async () => {
    await expect(checkText('内容', '')).rejects.toBeInstanceOf(ContentCheckUnavailableError);
    expect(msgSecCheckMock).not.toHaveBeenCalled();
  });

  it('throws ContentRiskError when suggest=risky', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'risky' } });
    await expect(checkText('坏内容', FAKE_OPENID, { kind: 'ai' })).rejects.toBeInstanceOf(
      ContentRiskError
    );
    try {
      await checkText('坏内容', FAKE_OPENID, { kind: 'ai' });
    } catch (e) {
      expect(e).toBeInstanceOf(ContentRiskError);
      expect((e as ContentRiskError).kind).toBe('ai');
      expect((e as ContentRiskError).suggest).toBe('risky');
    }
  });

  it('throws ContentRiskError when errCode=87014', async () => {
    msgSecCheckMock.mockRejectedValue(Object.assign(new Error('content risky'), { errCode: 87014 }));
    await expect(checkText('坏内容', FAKE_OPENID, { kind: 'user' })).rejects.toBeInstanceOf(
      ContentRiskError
    );
  });

  it('throws ContentCheckUnavailableError on generic API error (fail-closed)', async () => {
    msgSecCheckMock.mockRejectedValue(new Error('network down'));
    await expect(checkText('内容', FAKE_OPENID)).rejects.toBeInstanceOf(
      ContentCheckUnavailableError
    );
  });

  it('throws ContentCheckUnavailableError when errCode is non-zero non-violation', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 40001, errMsg: 'invalid token' });
    await expect(checkText('内容', FAKE_OPENID)).rejects.toBeInstanceOf(
      ContentCheckUnavailableError
    );
  });

  it('splits long text and fails fast on first risky segment', async () => {
    const longText = 'a'.repeat(2400) + 'b'.repeat(2400) + 'c'.repeat(500);
    msgSecCheckMock
      .mockResolvedValueOnce({ errCode: 0, result: { suggest: 'pass' } })
      .mockResolvedValueOnce({ errCode: 0, result: { suggest: 'risky' } })
      .mockResolvedValueOnce({ errCode: 0, result: { suggest: 'pass' } });

    await expect(checkText(longText, FAKE_OPENID, { kind: 'user' })).rejects.toBeInstanceOf(
      ContentRiskError
    );
    expect(msgSecCheckMock).toHaveBeenCalledTimes(2);
  });

  it('passes long text when every segment is pass', async () => {
    const longText = 'a'.repeat(2400) + 'b'.repeat(2400) + 'c'.repeat(500);
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'pass' } });
    await checkText(longText, FAKE_OPENID, { kind: 'user' });
    expect(msgSecCheckMock).toHaveBeenCalledTimes(3);
  });

  it('respects CONTENT_SECURITY_ENABLED=0 flag (skip all checks)', async () => {
    process.env.CONTENT_SECURITY_ENABLED = '0';
    await checkText('任何内容', FAKE_OPENID);
    expect(msgSecCheckMock).not.toHaveBeenCalled();
  });
});

describe('checkAiOutputText', () => {
  it('flattens parsed and forwards as kind=ai', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'pass' } });
    await checkAiOutputText(
      {
        narration: '旁白文本',
        dialogue: '对话文本',
        scenes: [{ type: 'narration', content: '幕一' }],
      },
      FAKE_OPENID
    );
    expect(msgSecCheckMock).toHaveBeenCalledTimes(1);
    const arg = msgSecCheckMock.mock.calls[0][0] as Record<string, unknown>;
    expect(arg.content).toContain('旁白文本');
    expect(arg.content).toContain('对话文本');
    expect(arg.content).toContain('幕一');
  });

  it('throws ContentRiskError with kind=ai when violated', async () => {
    msgSecCheckMock.mockResolvedValue({ errCode: 0, result: { suggest: 'risky' } });
    try {
      await checkAiOutputText({ narration: '违规旁白', dialogue: '', scenes: [] }, FAKE_OPENID);
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(ContentRiskError);
      expect((e as ContentRiskError).kind).toBe('ai');
    }
  });

  it('skips API when AI output is empty', async () => {
    await checkAiOutputText({ narration: '', dialogue: '', scenes: [] }, FAKE_OPENID);
    expect(msgSecCheckMock).not.toHaveBeenCalled();
  });
});
