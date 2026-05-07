/**
 * 会话管理：默认本地文件存储；微信云数据库见 `src/adapters/wechat/cloud-session-store.ts`。
 */
export {
  loadSession,
  saveSession,
  deleteSession,
  buildDemoSession,
  __resetMockSessionsForTest,
} from './session-manager';
export type { SessionStore } from './session-store-types';
export {
  FileSessionStore,
  createFileSessionStore,
  getDefaultFileSessionStore,
} from './file-session-store';
export { getScenariosRoot } from './scenario-paths';
