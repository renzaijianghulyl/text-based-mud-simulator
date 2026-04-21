import 'dotenv/config';

export * from './types';
export * from './errors';
export { callLLM } from './engine/llm-adapter';
export { parseResponse, validateParse } from './engine/response-parser';
export { buildPrompt } from './engine/prompt-builder';
export type { PromptMemoryInput } from './engine/prompt-builder';
export { updateMemory, isKeyEvent } from './engine/memory-manager';
export { process } from './engine/engine';
export {
  loadSession,
  saveSession,
  deleteSession,
  buildDemoSession,
  __resetMockSessionsForTest,
} from './sessions/session-manager';

import { parseResponse, validateParse } from './engine/response-parser';
import { updateMemory, isKeyEvent } from './engine/memory-manager';
import { process as engineProcess } from './engine/engine';
import {
  saveSession,
  loadSession,
  deleteSession,
  buildDemoSession,
  __resetMockSessionsForTest,
} from './sessions/session-manager';

/**
 * 本地自检：解析样例、记忆更新、mock 会话 CRUD；若配置了有效 LLM_API_KEY 则跑一轮 process。
 * 运行：`npm run build && RUN_SMOKE=1 node dist/index.js` 或 `npm run demo`（Unix）。
 */
export async function runSmokeTest(): Promise<void> {
  __resetMockSessionsForTest();

  const sample = `{
  "narration": "风沙骤起，虎牢关前旌旗猎猎。",
  "dialogue": "吕布：来者何人？",
  "stateChanges": { "hp": 0, "relationship": 2, "reason": "寒暄" }
}`;
  const parsed = parseResponse(sample);
  if (!validateParse(parsed)) {
    throw new Error('validateParse 对标准样例应通过');
  }

  const session = buildDemoSession('chief', 'hulaguan');
  const beforeRound = session.currentRound;
  updateMemory(session, '上前一揖', parsed, parsed.stateChanges);
  if (session.recentSummaryLines.length !== 1) {
    throw new Error('滚动摘要应追加 1 条');
  }
  if (!isKeyEvent({ hp: 0, relationship: 55 }, '试探')) {
    throw new Error('关系变化 >50 应判为关键事件');
  }
  if (isKeyEvent({ hp: 0, relationship: 10 }, '试探')) {
    throw new Error('小幅关系变化不应判为关键事件');
  }
  if (session.currentRound !== beforeRound + 1) {
    throw new Error('currentRound 应在 updateMemory 后递增');
  }

  await saveSession(buildDemoSession('chief', 'hulaguan'));
  const loaded = await loadSession('chief', 'hulaguan');
  if (loaded.player.hp !== 100) {
    throw new Error('mock load 应返回深拷贝会话');
  }
  await deleteSession('chief', 'hulaguan');

  const key = process.env.LLM_API_KEY?.trim();
  const placeholder =
    !key ||
    key.includes('your_api_key') ||
    key === 'your_api_key_here';
  if (placeholder) {
    // eslint-disable-next-line no-console
    console.log('[smoke] 已跳过真实 LLM（未配置有效 LLM_API_KEY）');
    return;
  }

  const live = buildDemoSession('chief', 'hulaguan');
  await saveSession(live);
  const s2 = await loadSession('chief', 'hulaguan');
  const result = await engineProcess(s2, '与吕布互通姓名，表示无意为敌');
  if (!result.narration || !result.dialogue) {
    throw new Error('process 应返回叙事内容');
  }
  await saveSession(result.state);
  await deleteSession('chief', 'hulaguan');
}

if (process.env.RUN_SMOKE === '1') {
  void runSmokeTest()
    .then(() => {
      // eslint-disable-next-line no-console
      console.log('[smoke] 完成');
    })
    .catch((e) => {
      // eslint-disable-next-line no-console
      console.error(e);
      process.exitCode = 1;
    });
}
