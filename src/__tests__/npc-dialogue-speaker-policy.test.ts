import { describe, expect, it } from 'vitest';
import {
  assertDialogueSpeakersAllowed,
  collectAllowedDialogueSpeakerLabels,
} from '../engine/npc-dialogue-speaker-policy';
import { ParseResponseError } from '../errors';

describe('npc-dialogue-speaker-policy', () => {
  it('collectAllowedDialogueSpeakerLabels 含卡司正名与你', () => {
    const s = collectAllowedDialogueSpeakerLabels('hulaguan');
    expect(s.has('你')).toBe(true);
    expect(s.has('吕布')).toBe(true);
  });

  it('虎牢关允许传令兵等匿名 speaker', () => {
    assertDialogueSpeakersAllowed('hulaguan', {
      narration: '营门喧哗。',
      dialogue: '',
      stateChanges: { hp: 0, relationship: 0 },
      scenes: [
        { type: 'narration', content: '营门喧哗。' },
        { type: 'dialogue', speaker: '传令兵', content: '报——' },
      ],
    });
  });

  it('赤壁允许水卒匿名 speaker', () => {
    assertDialogueSpeakersAllowed('chibi', {
      narration: '栈桥。',
      dialogue: '',
      stateChanges: { hp: 0, relationship: 0 },
      scenes: [{ type: 'dialogue', speaker: '水卒', content: '缆绳紧。' }],
    });
  });

  it('非卡司正名 speaker 抛 ParseResponseError', () => {
    expect(() =>
      assertDialogueSpeakersAllowed('hulaguan', {
        narration: 'x',
        dialogue: '',
        stateChanges: { hp: 0, relationship: 0 },
        scenes: [{ type: 'dialogue', speaker: '__非卡司占位__', content: '…' }],
      })
    ).toThrow(ParseResponseError);
  });

  it('xuanwu-men 不启用军阵匿名格（传令兵非法）', () => {
    expect(() =>
      assertDialogueSpeakersAllowed('xuanwu-men', {
        narration: 'x',
        dialogue: '',
        stateChanges: { hp: 0, relationship: 0 },
        scenes: [{ type: 'dialogue', speaker: '传令兵', content: '…' }],
      })
    ).toThrow(ParseResponseError);
  });
});
