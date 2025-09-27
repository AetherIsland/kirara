import { defineConfig } from 'rolldown';

export default defineConfig({
    platform: 'node',
    input: 'src/main.ts',
    output: {
        dir: 'dist',
        sourcemap: true,
        minify: true
    }
});
