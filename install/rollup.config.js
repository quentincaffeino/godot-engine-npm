import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy';
import pkg from './package.json' assert { type: 'json' };

export default [
  {
    input: 'src/index.js',
    output: {
      file: 'dist/install.js',
      format: 'esm',
    },
    external: id =>
      id.indexOf('godot.json') !== -1 ||
      id.indexOf('package.json') !== -1 ||
      id in pkg.dependencies,
    plugins: [
      resolve(),
      commonjs(),
      json(),
      copy({
        hook: 'writeBundle',
        targets: [
          {
            src: 'dist/install.js',
            dest: [
              '../packages/godot/',
              '../packages/godot-headless/',
              '../packages/godot-server/',
            ],
          },
        ],
        verbose: true,
      }),
    ],
  },
];
