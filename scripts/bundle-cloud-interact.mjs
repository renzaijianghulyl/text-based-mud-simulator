/**
 * 将 interact 云函数入口与引擎、会话模块打成单文件，便于上传微信云开发。
 * wx-server-sdk 保持 external，上传后在 cloud-dist/interact 目录执行 npm install。
 */
import * as esbuild from 'esbuild';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outDir = join(root, 'cloud-dist', 'interact');
const outfile = join(outDir, 'index.js');

mkdirSync(outDir, { recursive: true });

await esbuild.build({
  absWorkingDir: root,
  entryPoints: [join(root, 'src/functions/interact/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile,
  sourcemap: true,
  logLevel: 'info',
  external: ['wx-server-sdk'],
});

const pkgPath = join(outDir, 'package.json');
if (!existsSync(pkgPath)) {
  writeFileSync(
    pkgPath,
    JSON.stringify(
      {
        name: 'interact',
        version: '0.0.1',
        private: true,
        main: 'index.js',
        dependencies: {
          'wx-server-sdk': '~3.0.0',
        },
      },
      null,
      2
    ),
    'utf-8'
  );
}

console.log('Written:', outfile);
console.log('Next: cd cloud-dist/interact && npm install && upload folder to WeChat cloud.');
