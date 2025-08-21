import { defineConfig } from 'tsdown'

export default defineConfig({
  entry: ['./src/index.ts'],
  outDir: './dist',
  format: ['esm'],
  target: 'node22',
  minify: true,
  dts: true,
  sourcemap: true,
  clean: true,
})
