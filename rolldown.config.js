import { defineConfig } from 'rolldown';
import terser from '@rollup/plugin-terser';
import progress from 'rollup-plugin-progress';
import sizes from 'rollup-plugin-sizes';

export default defineConfig({
    platform: 'node',
    input: 'src/main.ts',
    output: {
        dir: 'dist',
        sourcemap: true
    },
    plugins: [
        terser(),
        progress(),
        sizes()
    ]
});
