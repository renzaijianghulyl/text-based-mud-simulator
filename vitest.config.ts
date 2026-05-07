import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary'],
      include: [
        'src/engine/**/*.ts',
        'src/sessions/session-manager.ts',
        'src/sessions/file-session-store.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        // 含引擎与 FileSessionStore I/O 分支，整体分支覆盖率约 73%+ 为当前基线
        branches: 72,
        statements: 80,
      },
    },
  },
});
