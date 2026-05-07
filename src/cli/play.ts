import 'dotenv/config';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { process as engineProcess } from '../engine/engine';
import {
  buildDemoSession,
  loadSession,
  saveSession,
  deleteSession,
} from '../sessions/session-manager';
import type { StoryScene } from '../types';
import { createCharacterProfile } from './create-character';
import { OPENING_ROUND_INTENT } from '../engine/opening-intent';

const USER_ID = process.env.CLI_USER_ID?.trim() || 'chief';
const SCENARIO_ID = process.env.CLI_SCENARIO_ID?.trim() || 'hulaguan';
const NPC_ID = process.env.CLI_NPC_ID?.trim();

function printWelcome(): void {
  // eslint-disable-next-line no-console
  console.log('文字 RPG 交互式 CLI 已启动');
  // eslint-disable-next-line no-console
  console.log(`会话: ${USER_ID}_${SCENARIO_ID}`);
  // eslint-disable-next-line no-console
  console.log(`目标 NPC: ${NPC_ID || '（场景默认）'}`);
  // eslint-disable-next-line no-console
  console.log('输入一句意图即可推进一轮；输入 /help 查看命令。');
}

function printRoundResult(
  narration: string,
  dialogue: string,
  scenes: StoryScene[] | undefined,
  hp: number,
  npcName: string,
  rel: number,
  round: number
): void {
  // eslint-disable-next-line no-console
  console.log('\n--- 本轮结果 ---');
  // eslint-disable-next-line no-console
  console.log(`轮次: R${round}`);
  if (Array.isArray(scenes) && scenes.length > 0) {
    scenes.forEach((scene, idx) => {
      const who = scene.speaker ? `｜${scene.speaker}` : '';
      // eslint-disable-next-line no-console
      console.log(`【第${idx + 1}幕｜${scene.type}${who}】`);
      // eslint-disable-next-line no-console
      console.log(scene.content);
    });
  } else {
    // eslint-disable-next-line no-console
    console.log(`旁白: ${narration}`);
    // eslint-disable-next-line no-console
    console.log(`对话: ${dialogue}`);
  }
  // eslint-disable-next-line no-console
  console.log(`状态: HP=${hp}, 与${npcName}关系=${rel}`);
}

async function resetSessionWithCharacter(rl: ReturnType<typeof createInterface>): Promise<void> {
  await deleteSession(USER_ID, SCENARIO_ID).catch(() => undefined);
  const playerRoleProfile = await createCharacterProfile(SCENARIO_ID, rl);
  await saveSession(buildDemoSession(USER_ID, SCENARIO_ID, NPC_ID, playerRoleProfile));
}

async function runOpeningRoundAndPrint(): Promise<void> {
  try {
    const s0 = await loadSession(USER_ID, SCENARIO_ID);
    const opening = await engineProcess(s0, OPENING_ROUND_INTENT);
    await saveSession(opening.state);
    printRoundResult(
      opening.narration,
      opening.dialogue,
      opening.scenes,
      opening.state.player.hp,
      opening.state.npcs.current.name,
      opening.state.npcs.current.relationship,
      opening.state.currentRound - 1
    );
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('开局旁白生成失败，可直接输入意图继续。', e);
  }
}

function formatRoleInfo(): string {
  return '玩家身份: 未设置';
}

async function handleCommand(cmd: string, rl: ReturnType<typeof createInterface>): Promise<boolean> {
  switch (cmd) {
    case '/help':
      // eslint-disable-next-line no-console
      console.log('命令: /help /state /reset /exit');
      return true;
    case '/state': {
      const s = await loadSession(USER_ID, SCENARIO_ID);
      const roleInfo =
        s.playerRoleProfile?.mode === 'oc'
          ? `原创角色｜姓名=${s.playerRoleProfile.name}｜背景=${s.playerRoleProfile.background}`
          : s.playerRoleProfile?.mode === 'general'
            ? `扮演武将｜武将=${s.playerRoleProfile.generalName}`
            : formatRoleInfo();
      // eslint-disable-next-line no-console
      console.log(
        `当前状态: R${s.currentRound} HP=${s.player.hp}/${s.player.maxHp} 关系=${s.npcs.current.relationship}\n${roleInfo}`
      );
      return true;
    }
    case '/reset':
      await resetSessionWithCharacter(rl);
      await runOpeningRoundAndPrint();
      // eslint-disable-next-line no-console
      console.log('会话已重置为初始状态。');
      return true;
    case '/exit':
      return false;
    default:
      // eslint-disable-next-line no-console
      console.log('未知命令，可输入 /help 查看可用命令。');
      return true;
  }
}

export async function runInteractiveCli(): Promise<void> {
  const rl = createInterface({ input, output });
  try {
    // 每次启动 CLI 都强制 reset 并重新建角，保证从干净会话开始。
    await resetSessionWithCharacter(rl);
    await runOpeningRoundAndPrint();
    printWelcome();

    // eslint-disable-next-line no-constant-condition
    while (true) {
      let line = '';
      try {
        line = (await rl.question('\n你> ')).trim();
      } catch (e) {
        const code = e && typeof e === 'object' && 'code' in e ? String((e as { code?: unknown }).code) : '';
        const msg = e instanceof Error ? e.message : String(e);
        if (code === 'ERR_USE_AFTER_CLOSE' || msg.toLowerCase().includes('readline was closed')) {
          break;
        }
        throw e;
      }
      if (!line) continue;
      if (line.startsWith('/')) {
        const shouldContinue = await handleCommand(line, rl);
        if (!shouldContinue) break;
        continue;
      }

      const session = await loadSession(USER_ID, SCENARIO_ID);
      const result = await engineProcess(session, line);
      await saveSession(result.state);

      printRoundResult(
        result.narration,
        result.dialogue,
        result.scenes,
        result.state.player.hp,
        result.state.npcs.current.name,
        result.state.npcs.current.relationship,
        result.state.currentRound - 1
      );
    }
  } finally {
    rl.close();
  }
}

if (require.main === module) {
  void runInteractiveCli().catch((e) => {
    // eslint-disable-next-line no-console
    console.error('CLI 运行失败:', e);
    process.exitCode = 1;
  });
}
