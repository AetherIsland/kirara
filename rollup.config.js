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
        format: 'esm',
        sourcemap: true
    },
    plugins: [
        nodeResolve(),
        typescript({
            /**
             * @see https://github.com/rollup/plugins/issues/1583
             * @see @tsconfig/node-lts/tsconfig.json
             */
            module: 'node16'
        }),
        terser()
    ]
};
