import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Vite config for the Artwork Form Filler SPA.
// Dev server runs on http://localhost:5173; production build outputs to dist/.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
  },
});
