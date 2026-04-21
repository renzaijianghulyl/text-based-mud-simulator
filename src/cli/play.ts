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
  hp: number,
  npcName: string,
  rel: number,
  round: number
): void {
  // eslint-disable-next-line no-console
  console.log('\n--- 本轮结果 ---');
  // eslint-disable-next-line no-console
  console.log(`轮次: R${round}`);
  // eslint-disable-next-line no-console
  console.log(`旁白: ${narration}`);
  // eslint-disable-next-line no-console
  console.log(`对话: ${dialogue}`);
  // eslint-disable-next-line no-console
  console.log(`状态: HP=${hp}, 与${npcName}关系=${rel}`);
}

async function ensureSession(): Promise<void> {
  try {
    await loadSession(USER_ID, SCENARIO_ID);
  } catch {
    await saveSession(buildDemoSession(USER_ID, SCENARIO_ID, NPC_ID));
  }
}

async function handleCommand(cmd: string): Promise<boolean> {
  switch (cmd) {
    case '/help':
      // eslint-disable-next-line no-console
      console.log('命令: /help /state /reset /exit');
      return true;
    case '/state': {
      const s = await loadSession(USER_ID, SCENARIO_ID);
      // eslint-disable-next-line no-console
      console.log(
        `当前状态: R${s.currentRound} HP=${s.player.hp}/${s.player.maxHp} 关系=${s.npcs.current.relationship}`
      );
      return true;
    }
    case '/reset':
      await deleteSession(USER_ID, SCENARIO_ID);
      await saveSession(buildDemoSession(USER_ID, SCENARIO_ID, NPC_ID));
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
  await ensureSession();
  printWelcome();

  const rl = createInterface({ input, output });
  try {
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const line = (await rl.question('\n你> ')).trim();
      if (!line) continue;
      if (line.startsWith('/')) {
        const shouldContinue = await handleCommand(line);
        if (!shouldContinue) break;
        continue;
      }

      const session = await loadSession(USER_ID, SCENARIO_ID);
      const result = await engineProcess(session, line);
      await saveSession(result.state);

      printRoundResult(
        result.narration,
        result.dialogue,
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
