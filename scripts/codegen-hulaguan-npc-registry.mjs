/**
 * 从 scenarios/hulaguan 读取 config + npcs/*.json，生成 src/sessions/hulaguan-npc-registry.generated.ts
 * 供云函数打包与本地会话共用（不修改剧本 JSON）。
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const scenarioDir = join(root, 'scenarios', 'hulaguan');
const configPath = join(scenarioDir, 'config.json');
const outPath = join(root, 'src', 'sessions', 'hulaguan-npc-registry.generated.ts');

const config = JSON.parse(readFileSync(configPath, 'utf-8'));
const availableNpcs = Array.isArray(config.availableNpcs) ? [...config.availableNpcs] : [];
const defaultTarget = typeof config.defaultTarget === 'string' && config.defaultTarget ? config.defaultTarget : 'lv-bu';

/** @type {Record<string, unknown>} */
const templates = {};

for (const id of availableNpcs) {
  const p = join(scenarioDir, 'npcs', `${id}.json`);
  if (!existsSync(p)) {
    console.warn('skip missing npc file:', id);
    continue;
  }
  const raw = JSON.parse(readFileSync(p, 'utf-8'));
  templates[id] = {
    id: String(raw.id ?? id),
    name: String(raw.name ?? id),
    title: typeof raw.title === 'string' ? raw.title : undefined,
    personality: typeof raw.personality === 'string' && raw.personality.trim() ? raw.personality.trim() : '沉稳',
    motivation:
      typeof raw.motivation === 'string' && raw.motivation.trim() ? raw.motivation.trim() : '达成当前局势下的目标',
    speakingStyle: typeof raw.speakingStyle === 'string' ? raw.speakingStyle : undefined,
    equipment: Array.isArray(raw.equipment) ? raw.equipment.map(String) : undefined,
    mount: typeof raw.mount === 'string' ? raw.mount : undefined,
    redLines: Array.isArray(raw.redLines) ? raw.redLines.map(String) : [],
    relationship: 0,
  };
}

const ids = Object.keys(templates);
if (ids.length === 0) {
  throw new Error('codegen: no NPC templates resolved');
}

const jsonLiteral = JSON.stringify(templates, null, 2);
const header = `/* eslint-disable */\n/**\n * 由 scripts/codegen-hulaguan-npc-registry.mjs 生成，请勿手改。运行：npm run codegen:hulaguan-npcs\n */\nimport type { CurrentNpc } from '../types';\n\n`;

const body = `
export const HULAGUAN_DEFAULT_TARGET_NPC_ID = ${JSON.stringify(defaultTarget)} as const;

export const HULAGUAN_AVAILABLE_NPC_IDS = ${JSON.stringify(ids)} as const;

type HulaguanNpcId = (typeof HULAGUAN_AVAILABLE_NPC_IDS)[number];

const RAW_TEMPLATES = ${jsonLiteral} as Record<string, CurrentNpc>;

export function getHulaguanNpcTemplateById(npcId: string): CurrentNpc | null {
  const row = RAW_TEMPLATES[npcId];
  return row ? { ...row, relationship: 0 } : null;
}

export function pickRandomHulaguanNpcId(): string {
  const list = HULAGUAN_AVAILABLE_NPC_IDS;
  const i = Math.floor(Math.random() * list.length);
  return list[i]!;
}

export function resolveHulaguanNpcIdForSession(requestedNpcId?: string): string {
  const req = requestedNpcId?.trim();
  if (req && RAW_TEMPLATES[req]) return req;
  return pickRandomHulaguanNpcId();
}
`;

writeFileSync(outPath, header + body, 'utf-8');
console.log('Written', outPath, 'npcs:', ids.length);
