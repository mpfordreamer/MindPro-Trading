import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '.') } },
  plugins: [react()], // test komponen (.tsx); tsconfig Next memakai jsx:"preserve" sehingga perlu plugin ini
  test: {
    include: ['tests/unit/**/*.test.{ts,tsx}'],
    coverage: { include: ['lib/validators.ts', 'lib/tradeMath.ts', 'lib/errors.ts', 'lib/marketMath.ts', 'lib/priceValidation.ts', 'lib/imageBytes.ts', 'lib/cache.ts', 'lib/journalMath.ts', 'lib/agentScore.ts', 'lib/retention.ts', 'lib/analysisRows.ts', 'lib/alertEngine.ts', 'lib/alertMessages.ts', 'lib/shareFormat.ts', 'lib/discordUrl.ts', 'lib/pdfFormat.ts', 'lib/agentFilter.ts', 'lib/prefs.ts', 'hooks/usePreferences.ts', 'components/DebateArena.tsx', 'components/CompactAgentTable.tsx', 'components/AgentCard.tsx', 'components/Toast.tsx'] },
  },
});
