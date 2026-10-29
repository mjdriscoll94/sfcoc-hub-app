import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/lib/mcp/**/*.test.ts', 'src/lib/lifeGroups/**/*.test.ts', 'src/lib/utils/householdMembers.test.ts'],
  },
});
