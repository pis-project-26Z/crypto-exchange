/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    reporters: ['default', 'junit'],
    outputFile: { junit: 'test-results/junit.xml' },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      // main.tsx only mounts <App />, nothing worth testing there
      exclude: ['src/main.tsx', 'src/**/*.test.{ts,tsx}'],
      // Sonar reads lcov; paths are relative to the repo root so it can match frontend/src/...
      reporter: ['text', 'html', 'cobertura', ['lcov', { projectRoot: '..' }]],
    },
  },
})
