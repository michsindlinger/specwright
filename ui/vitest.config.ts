import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    testTimeout: 10000,
    // Unit tests must never touch a real tmux server; tmux-dependent
    // integration tests opt back in behind describe.skipIf.
    env: { SPECWRIGHT_TMUX: 'off' },
  },
});
