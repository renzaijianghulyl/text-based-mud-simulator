import * as fs from 'fs';
import * as path from 'path';

/** 与 prompt / 记忆判定共用，须稳定且非空 */
export const OPENING_ROUND_MARKER = '【开局】';

/**
 * 新开局首轮：走标准 process + JSON 输出，但语义为「仅环境与氛围旁白」。
 * 长度控制在 prompt-builder 的 BUDGET_INTENT 内。
 */
export const OPENING_ROUND_INTENT =
  `${OPENING_ROUND_MARKER}请生成本局首段环境与氛围旁白：玩家尚未行动。结合【剧本开场参考】与【玩家角色信息】；以 narration 为主、action 可穿插；旁白末宜自然埋下 2～3 个「情境钩子」（如远处喧哗、传令、马蹄、帐外人声、风声旗影等），让读者能联想到「可打听、可观察、可趋近」等方向，但勿用命令式替玩家抉择（禁止「你决定…」「你应当…」）；可无 NPC dialogue 幕；若写 dialogue 则至多 1 句且宜短、speaker 须为在场 NPC 名；stateChanges 的 hp、relationship 须均为 0。`;

export function isOpeningRoundIntent(intent: string): boolean {
  return intent.trim().startsWith(OPENING_ROUND_MARKER);
}

/** 注入 prompt 的开局导演块（与剧本 JSON 无关） */
export const OPENING_PROMPT_DIRECTOR = `【开局旁白导演】
此轮仅铺开场：以时空、感官与氛围建立在场感；不要推动重大剧情转折；不得描写玩家已做出的具体行动；NPC 若出现宜为远景、侧写或一声带过，避免长篇对白交锋。
收束时可在环境层面呈现 2～3 个可感知的机会或悬念（人物不必出场），便于读者自行想象下一步探索方向；不得写「你去做某事」类代操作句。`;

/**
 * 读取剧本 config.json 中的 openingNarration（供开局轮 prompt 使用）。
 */
function readOpeningConfigFields(scenarioId: string): {
  openingNarration?: string;
  openingPlayerHint?: string;
} {
  const filePath = path.join(process.cwd(), 'scenarios', scenarioId, 'config.json');
  if (!fs.existsSync(filePath)) return {};
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    const j = JSON.parse(raw) as { openingNarration?: string; openingPlayerHint?: string };
    const narration =
      typeof j.openingNarration === 'string' && j.openingNarration.trim().length > 0
        ? j.openingNarration.trim()
        : undefined;
    const hint =
      typeof j.openingPlayerHint === 'string' && j.openingPlayerHint.trim().length > 0
        ? j.openingPlayerHint.trim()
        : undefined;
    return { openingNarration: narration, openingPlayerHint: hint };
  } catch {
    return {};
  }
}

export function readScenarioOpeningNarration(scenarioId: string): string | undefined {
  return readOpeningConfigFields(scenarioId).openingNarration;
}

/** 策划可配的「此刻情境锚点」，注入开局 prompt，不要求模型逐字照抄。 */
export function readScenarioOpeningPlayerHint(scenarioId: string): string | undefined {
  return readOpeningConfigFields(scenarioId).openingPlayerHint;
}
