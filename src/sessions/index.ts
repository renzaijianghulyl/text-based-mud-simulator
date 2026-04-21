/**
 * 会话管理：当前为内存 mock，后续替换云数据库。
 */
export {
  loadSession,
  saveSession,
  deleteSession,
  buildDemoSession,
  __resetMockSessionsForTest,
} from './session-manager';
