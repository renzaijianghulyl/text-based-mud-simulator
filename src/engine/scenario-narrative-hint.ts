/**
 * 按 scenarioId 注入「剧本类型」叙事提示（与 narrative-prompt-guide-v3 中战争/恋爱等分类对齐，可逐步扩展）。
 */
export function getScenarioNarrativeHint(scenarioId: string): string {
  const map: Record<string, string> = {
    hulaguan:
      '当前剧本类型：战争类（虎牢关之战）——氛围紧张、激烈、危险；用词豪迈、肃杀；突出武力对决与生死较量。',
  };
  return (
    map[scenarioId] ??
    '当前剧本类型：通用——请根据【NPC 人设】与【关键事件】把握叙事风格，保持人设与时代感。'
  );
}
