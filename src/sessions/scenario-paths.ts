import * as path from 'path';

/**
 * 剧本包根目录。未设置 `SCENARIOS_ROOT` 时默认为 `process.cwd()/scenarios`。
 */
export function getScenariosRoot(): string {
  const raw = process.env.SCENARIOS_ROOT?.trim();
  if (raw) {
    return path.resolve(raw);
  }
  return path.join(process.cwd(), 'scenarios');
}
