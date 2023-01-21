import fs from 'fs';
import path from 'path';

import mkdirp from 'mkdirp';
import AdmZip from 'adm-zip';

/**
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<string|undefined>}
 */
async function createBindDir(ctx) {
  return mkdirp(path.dirname(ctx.binPath));
}

/**
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<import('./context.js').Context>}
 */
async function extract(ctx) {
  await createBindDir(ctx);

  const target = ctx.binPath;

  const zip = new AdmZip(ctx.downloadPath);
  const zipEntries = zip.getEntries();
  for (const zipEntry of zipEntries) {
    zip.extractEntryTo(zipEntry, target, true, true);

    if (zipEntry.entryName.startsWith('Godot_')) {
      const godotBinPath = path.resolve(target, 'godot');
      fs.renameSync(path.resolve(target, zipEntry.entryName), godotBinPath);
      fs.chmodSync(godotBinPath, 0o755);
    }
  }

  return target;
}

export default extract;
