import * as fs from 'fs';
import * as path from 'path';
import type { Interface } from 'node:readline/promises';
import type { PlayerRoleProfile } from '../types';

interface ScenarioConfig {
  availableNpcs?: string[];
}

interface NpcFile {
  id: string;
  name: string;
}

interface GeneralOption {
  id: string;
  name: string;
}

const GENERAL_ATTR_HINTS: Record<string, string> = {
  关羽: '武力 97，忠义 100',
  张飞: '武力 98，忠义 100',
  赵云: '武力 96，忠义 95',
  夏侯惇: '武力 92，忠义 100',
  孙坚: '武力 95，统率 93',
};

function scenarioConfigPath(scenarioId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'config.json');
}

function scenarioNpcPath(scenarioId: string, npcId: string): string {
  return path.join(process.cwd(), 'scenarios', scenarioId, 'npcs', `${npcId}.json`);
}

function readGeneralOptions(scenarioId: string): GeneralOption[] {
  const configFile = scenarioConfigPath(scenarioId);
  if (!fs.existsSync(configFile)) return [];
  const configRaw = fs.readFileSync(configFile, 'utf-8');
  const config = JSON.parse(configRaw) as ScenarioConfig;
  const npcIds = Array.isArray(config.availableNpcs) ? config.availableNpcs : [];
  const options: GeneralOption[] = [];
  for (const npcId of npcIds) {
    const npcFile = scenarioNpcPath(scenarioId, npcId);
    if (!fs.existsSync(npcFile)) continue;
    const npcRaw = fs.readFileSync(npcFile, 'utf-8');
    const npc = JSON.parse(npcRaw) as NpcFile;
    if (!npc.name?.trim()) continue;
    options.push({ id: npc.id, name: npc.name.trim() });
  }
  return options;
}

function printGeneralOptions(generals: GeneralOption[]): void {
  // eslint-disable-next-line no-console
  console.log('\n请选择你要扮演的武将：');
  generals.forEach((item, idx) => {
    const hint = GENERAL_ATTR_HINTS[item.name] ?? '属性待补充';
    // eslint-disable-next-line no-console
    console.log(`${idx + 1}. ${item.name}（${hint}）`);
  });
  // eslint-disable-next-line no-console
  console.log('（输入数字选择，或输入武将名）');
}

function matchGeneralByInput(inputText: string, generals: GeneralOption[]): GeneralOption | undefined {
  const normalized = inputText.trim();
  if (!normalized) return undefined;
  const idx = Number(normalized);
  if (Number.isInteger(idx) && idx >= 1 && idx <= generals.length) {
    return generals[idx - 1];
  }
  return generals.find((x) => x.name === normalized);
}

/**
 * CLI 建角：支持原创角色（姓名+背景）与扮演武将（武将名）。
 */
export async function createCharacterProfile(
  scenarioId: string,
  rl: Interface
): Promise<PlayerRoleProfile> {
  // eslint-disable-next-line no-console
  console.log('\n【创建角色】');
  // eslint-disable-next-line no-console
  console.log('1. 原创角色（填写姓名+背景）');
  // eslint-disable-next-line no-console
  console.log('2. 扮演武将（从列表选择）');

  while (true) {
    const modeInput = (await rl.question('\n请选择身份模式（1/2）: ')).trim();
    if (modeInput === '1') {
      let name = '';
      while (!name) {
        name = (await rl.question('请输入原创角色姓名（不能为空）: ')).trim();
        if (!name) {
          // eslint-disable-next-line no-console
          console.log('姓名不能为空，请重新输入。');
        }
      }
      let background = '';
      while (!background) {
        background = (await rl.question('请输入原创角色背景（不能为空，可含性别/家事/关系等）: ')).trim();
        if (!background) {
          // eslint-disable-next-line no-console
          console.log('背景不能为空，请重新输入。');
        }
      }
      return { mode: 'oc', name, background };
    }
    if (modeInput === '2') {
      const generals = readGeneralOptions(scenarioId);
      if (generals.length === 0) {
        // eslint-disable-next-line no-console
        console.log('当前剧本未找到可选武将列表，请先使用原创角色。');
        continue;
      }
      printGeneralOptions(generals);
      while (true) {
        const selection = (await rl.question('\n请输入序号或武将名: ')).trim();
        const picked = matchGeneralByInput(selection, generals);
        if (picked) {
          return { mode: 'general', generalName: picked.name };
        }
        // eslint-disable-next-line no-console
        console.log('输入无效：序号越界或武将名不在列表内，请重试。');
      }
    }
    // eslint-disable-next-line no-console
    console.log('仅支持输入 1 或 2，请重试。');
  }
}

