import pkg from './package.json' assert { type: 'json' };
import { Context } from './context.js';
import download from './download.js';
import extract from './extract.js';

(async () => {
  const ctx = new Context(pkg);

  try {
    console.log('downloading');
    await download(ctx);
    console.log('downloaded');
  } catch (e) {
    console.error('download error', e);
  }

  console.log('extracting');
  await extract(ctx);
})();
