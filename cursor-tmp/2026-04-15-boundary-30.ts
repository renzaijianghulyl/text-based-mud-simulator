/**
 * 30 轮边界手工脚本（非 Vitest）。运行示例：
 * npx ts-node --compiler-options '{"module":"CommonJS"}' cursor-tmp/2026-04-15-boundary-30.ts
 * 或先 npm run build 再视需要接入 dist。
 */
import 'dotenv/config';
import { process as engineProcess } from '../src/engine/engine';
import {
  buildDemoSession,
  loadSession,
  saveSession,
  deleteSession,
} from '../src/sessions/session-manager';

const USER_ID = 'boundary-test';
const SCENARIO_ID = 'hulaguan';

const testIntents = [
  '我是谁，我在哪',
  '吕布是谁',
  '我要投靠吕布',
  '吕布我佩服你',
  '你能教我武功吗',
  '吕布你也就那样',
  '我看不起你吕布',
  '我要离开这里',
  '我要投降曹操',
  '董卓才是真英雄',
  '吕布你就是个三姓家奴',
  '我要刺杀吕布',
  '吕布你怕死吗',
  '我看不起义父子',
  '我要勒死吕布',
  '我要跳城自杀',
  '我要投靠董卓背叛吕布',
  '吕布你和董卓都是畜生',
  '我要烧了虎牢关',
  '我要杀了所有人',
  '吕布你是个懦夫',
  '我要给曹操通风报信',
  '吕布你打不过关羽',
  '我要偷走方天画戟',
  '吕布你和董卓断袖',
  '我要炸了虎牢关',
  '吕布你个废物',
  '我要取代吕布',
  '我要让吕布给我磕头',
  '我要毁灭这个世界',
];

async function runBoundaryTest(): Promise<void> {
  // eslint-disable-next-line no-console
  console.log('=== 边界测试开始 ===\n');

  try {
    await deleteSession(USER_ID, SCENARIO_ID);
    // eslint-disable-next-line no-console
    console.log('已清理旧会话\n');
  } catch {
    // ignore
  }

  const session = buildDemoSession(USER_ID, SCENARIO_ID);
  await saveSession(session);
  // eslint-disable-next-line no-console
  console.log('已创建新会话\n');

  const hpHistory: number[] = [];
  const relationshipHistory: number[] = [];
  let emptyCount = 0;
  let totalScore = 0;
  let scoreCount = 0;

  for (let i = 0; i < testIntents.length; i++) {
    const intent = testIntents[i];
    const round = i + 1;

    try {
      // eslint-disable-next-line no-console
      console.log(`\n=== R${round} ===`);
      // eslint-disable-next-line no-console
      console.log(`意图：${intent}`);

      const sessionBefore = await loadSession(USER_ID, SCENARIO_ID);
      const result = await engineProcess(sessionBefore, intent);

      await saveSession(result.state);

      const hp = result.state.player.hp;
      const relationship = result.state.npcs.current.relationship;
      hpHistory.push(hp);
      relationshipHistory.push(relationship);

      if (!result.narration || !result.dialogue) {
        emptyCount++;
        // eslint-disable-next-line no-console
        console.log(`⚠️ 空数据！`);
      }

      // eslint-disable-next-line no-console
      console.log(`旁白：${result.narration.slice(0, 100)}...`);
      // eslint-disable-next-line no-console
      console.log(`对话：${result.dialogue}`);
      // eslint-disable-next-line no-console
      console.log(`状态：HP=${hp}, 关系=${relationship}`);
      // eslint-disable-next-line no-console
      console.log(`变化：HP=${result.changes.hp}, 关系=${result.changes.relationship}`);

      const meta = (result as { meta?: { directorScore?: { total: number } } }).meta;
      if (meta?.directorScore?.total) {
        totalScore += meta.directorScore.total;
        scoreCount++;
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error(`❌ R${round} 失败：`, error);
    }
  }

  // eslint-disable-next-line no-console
  console.log('\n=== 测试统计 ===');
  // eslint-disable-next-line no-console
  console.log(`总轮数：${hpHistory.length}`);
  if (hpHistory.length === 0) {
    // eslint-disable-next-line no-console
    console.log('无成功轮次，跳过统计');
    return;
  }
  // eslint-disable-next-line no-console
  console.log(`空数据：${emptyCount}轮 (${((emptyCount / hpHistory.length) * 100).toFixed(1)}%)`);
  // eslint-disable-next-line no-console
  console.log(`HP 范围：${Math.min(...hpHistory)} - ${Math.max(...hpHistory)}`);
  // eslint-disable-next-line no-console
  console.log(`HP 总下降：${hpHistory[0] - hpHistory[hpHistory.length - 1]}`);
  // eslint-disable-next-line no-console
  console.log(`关系范围：${Math.min(...relationshipHistory)} - ${Math.max(...relationshipHistory)}`);
  // eslint-disable-next-line no-console
  console.log(`平均分：${scoreCount > 0 ? (totalScore / scoreCount).toFixed(1) : 'N/A'}`);

  // eslint-disable-next-line no-console
  console.log('\n=== 验收结果 ===');
  const emptyRate = (emptyCount / hpHistory.length) * 100;
  const passEmpty = emptyRate === 0;
  const passHp = hpHistory[0] - hpHistory[hpHistory.length - 1] > 0;
  const passRelationship = Math.min(...relationshipHistory) < -50;

  // eslint-disable-next-line no-console
  console.log(`空数据率：${emptyRate.toFixed(1)}% ${passEmpty ? '✅' : '❌'}`);
  // eslint-disable-next-line no-console
  console.log(`HP 下降：${passHp ? '✅' : '❌'}`);
  // eslint-disable-next-line no-console
  console.log(`关系红线触发：${passRelationship ? '✅' : '❌'}`);

  // eslint-disable-next-line no-console
  console.log('\n=== 边界测试完成 ===');
}

void runBoundaryTest();
