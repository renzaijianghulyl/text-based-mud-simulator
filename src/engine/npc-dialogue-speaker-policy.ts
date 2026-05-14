import type { ParseResult } from '../types';
import { ParseResponseError } from '../errors';
import { loadScenarioNpcRoster } from './eliminated-npcs';

/**
 * 虎牢关、赤壁：允许无名群像作 dialogue.speaker（整串须完全匹配）。
 * 其他剧本仅卡司正名/别名与「你」，可按剧本再扩展。
 */
const ANONYMOUS_DIALOGUE_SPEAKER_RE =
  /^(?:传令兵|斥候|士卒|军士|亲兵|帐外士卒|亲卫|卫兵|哨兵|小校|军卒|队率|曲侯|水卒|舟子|艄公)(?:\d+)?$/;

export function collectAllowedDialogueSpeakerLabels(scenarioId: string): Set<string> {
  const labels = new Set<string>(['你']);
  for (const entry of loadScenarioNpcRoster(scenarioId)) {
    for (const name of entry.names) {
      if (name.length > 0) labels.add(name);
    }
  }
  return labels;
}

function anonymousDialogueSpeakerPatternForScenario(scenarioId: string): RegExp | null {
  if (scenarioId === 'hulaguan' || scenarioId === 'chibi') {
    return ANONYMOUS_DIALOGUE_SPEAKER_RE;
  }
  return null;
}

/** 解析通过后校验：dialogue 的 speaker 须在卡司名/别名、「你」或允许的群像称谓内。 */
export function assertDialogueSpeakersAllowed(scenarioId: string, parsed: ParseResult): void {
  const scenes = parsed.scenes;
  if (!scenes || scenes.length === 0) return;
  const allowed = collectAllowedDialogueSpeakerLabels(scenarioId);
  const anonRe = anonymousDialogueSpeakerPatternForScenario(scenarioId);
  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    if (scene.type !== 'dialogue') continue;
    const speaker = scene.speaker?.trim();
    if (!speaker) continue;
    if (allowed.has(speaker)) continue;
    if (anonRe?.test(speaker)) continue;
    const examples = [...allowed].filter((x) => x !== '你').slice(0, 28).join('、');
    const msg = `scenes[${i}].speaker「${speaker}」非本剧本卡司名/别名、允许的群像称谓或「你」。未入卡司者请写在 narration/action（传闻侧写），勿用作 dialogue 的 speaker。卡司名示例：${examples}`;
    throw new ParseResponseError(msg.slice(0, 520));
  }
}
