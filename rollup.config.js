import babel from 'rollup-plugin-babel';
import resolve from '@rollup/plugin-node-resolve';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';

const plugins = [resolve(), babel(), terser()];
const getOutputModule = moduleName => {
  return [
    {
      file: pkg.exports[moduleName].require,
      format: 'cjs',
      exports: 'named'
    },
    {
      file: pkg.exports[moduleName].import,
      format: 'es',
      exports: 'named'
    }
  ];
};

export default [{ plugins, input: './src/index.js', output: getOutputModule('.') }];
