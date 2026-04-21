import 'dotenv/config';
import { process as engineProcess } from '../engine/engine';
import {
  buildDemoSession,
  loadSession,
  saveSession,
  deleteSession,
} from '../sessions/session-manager';
import * as fs from 'fs';
import * as path from 'path';

const USER_ID = process.env.TEST_USER_ID?.trim() || 'eden';
const SCENARIO_ID = process.env.TEST_SCENARIO_ID?.trim() || 'hulaguan';
const WORK_DIR = process.env.TEST_WORK_DIR?.trim() || 'docs/tmp/boundary-test';

interface TestRound {
  round: number;
  type: 'round';
  intent: string;
  narration: string;
  dialogue: string;
  myHealth: number;
  targetHealth: number;
  meta?: {
    directorScore?: {
      total: number;
      creativity: number;
      impact: number;
      pacing: number;
      coherence: number;
    };
    beatType?: string;
  };
  elapsed: number;
  timestamp: string;
}

interface TestOutput {
  rounds: TestRound[];
}

async function runInteractiveTest(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('=== 边界测试启动 ===');
  // eslint-disable-next-line no-console
  console.log(`用户：${USER_ID}`);
  // eslint-disable-next-line no-console
  console.log(`剧本：${SCENARIO_ID}`);
  // eslint-disable-next-line no-console
  console.log(`工作目录：${WORK_DIR}`);

  // 创建工作目录
  const workDir = path.resolve(WORK_DIR);
  if (!fs.existsSync(workDir)) {
    fs.mkdirSync(workDir, { recursive: true });
  }

  const inputPath = path.join(workDir, 'input.json');
  const outputPath = path.join(workDir, 'output.json');

  // 清理旧会话
  try {
    await deleteSession(USER_ID, SCENARIO_ID);
    // eslint-disable-next-line no-console
    console.log('已清理旧会话');
  } catch {
    // 会话不存在，忽略
  }

  // 创建新会话
  const session = buildDemoSession(USER_ID, SCENARIO_ID);
  await saveSession(session);
  // eslint-disable-next-line no-console
  console.log('已创建新会话');

  const output: TestOutput = { rounds: [] };

  // 等待输入文件
  // eslint-disable-next-line no-console
  console.log('\n等待意图输入...');

  while (true) {
    // 检查输入文件
    if (!fs.existsSync(inputPath)) {
      await sleep(2000);
      continue;
    }

    // 读取输入
    let inputData: { intent: string; round: number };
    try {
      const inputText = fs.readFileSync(inputPath, 'utf-8');
      inputData = JSON.parse(inputText);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('读取输入文件失败:', error);
      await sleep(2000);
      continue;
    }

    const { intent, round } = inputData;
    // eslint-disable-next-line no-console
    console.log(`\n=== 第${round}轮 | 意图：${intent} ===`);

    // 删除输入文件（防止重复处理）
    fs.unlinkSync(inputPath);

    // 运行引擎
    const startTime = Date.now();
    try {
      const sessionBefore = await loadSession(USER_ID, SCENARIO_ID);
      const result = await engineProcess(sessionBefore, intent);

      // 保存会话
      await saveSession(result.state);

      const elapsed = (Date.now() - startTime) / 1000;

      // 记录结果
      const testRound: TestRound = {
        round,
        type: 'round',
        intent,
        narration: result.narration,
        dialogue: result.dialogue,
        myHealth: result.state.player.hp,
        targetHealth: 100,  // CurrentNpc 没有 hp 字段
        elapsed,
        timestamp: new Date().toISOString(),
      };

      output.rounds.push(testRound);

      // 写入输出文件
      fs.writeFileSync(outputPath, JSON.stringify(output.rounds, null, 2));

      // eslint-disable-next-line no-console
      console.log(`[${elapsed.toFixed(1)}s] 结果已写入，等待下一轮输入...`);
      // eslint-disable-next-line no-console
      console.log(`HP=${result.state.player.hp}, 关系=${result.state.npcs.current.relationship}`);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`❌ 第${round}轮失败:`, error);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 运行测试
runInteractiveTest().catch(console.error);
