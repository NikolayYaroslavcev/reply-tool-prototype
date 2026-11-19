import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  base: '/reply-tool-prototype/',
  plugins: [react()],
  test: { environment: 'jsdom' },
})
