import { nodeResolve } from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
    input: './src/main.ts',
    output: {
        dir: './dist',
        sourcemap: true
    },
    plugins: [
        nodeResolve(),
        typescript({
            module: 'esnext',
            moduleResolution: 'bundler'
        }),
        terser()
    ]
};
