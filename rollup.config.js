import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';
import terser from '@rollup/plugin-terser';
import progress from 'rollup-plugin-progress';
import sizes from 'rollup-plugin-sizes';

/**
 * @type {import('rollup').RollupOptions}
 */
export default {
    input: 'src/main.ts',
    output: {
        dir: 'dist',
        sourcemap: true
    },
    plugins: [
        nodeResolve(),
        commonjs(),
        typescript({
            module: 'esnext',
            moduleResolution: 'bundler'
        }),
        terser(),
        progress(),
        sizes()
    ]
};
