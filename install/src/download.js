import os from 'os';
import path from 'path';
import { EventEmitter } from 'events';

import mkdirp from 'mkdirp';
import EasyDL from 'easydl';
import formatTime from 'pretty-ms';
import formatBytes from 'pretty-bytes';
import { MultiBar, Presets } from 'cli-progress';

import godotFileMap from './godot.json' assert { type: 'json' };

const BASE_URL = 'https://downloads.tuxfamily.org/godotengine';

const completeStringParts = Presets.rect.barCompleteChar.repeat(40);
const incompleteStringParts = Presets.rect.barIncompleteChar.repeat(40);
const completeStringTotal = Presets.shades_classic.barCompleteChar.repeat(40);
const incompleteStringTotal =
  Presets.shades_classic.barIncompleteChar.repeat(40);
const refProgress = [];
const multibar = new MultiBar({
  clearOnComplete: false,
  format: (options, params, payload) => {
    const { id, text, total, speed, groupStart, groupEnd } = payload;
    if (text) return text;

    const completeStr = total ? completeStringTotal : completeStringParts;
    const incompleteStr = total ? incompleteStringTotal : incompleteStringParts;
    const completeSize = Math.round(params.progress * options.barsize);
    const incompleteSize = options.barsize - completeSize;
    const completeBarText = completeStr.substring(0, completeSize);
    const completeBar = total ? completeBarText : completeBarText;
    const bar = `${completeBar}${incompleteStr.substring(0, incompleteSize)}`;

    let eta = 'N/A';
    let speedTxt = 'N/A';
    const value = formatBytes(params.value);
    const percent = (params.progress * 100).toFixed(2);

    const etaVal = params.eta * 1000;
    if (etaVal === etaVal) eta = formatTime(etaVal);
    if (speed !== Infinity && speed === speed) speedTxt = formatBytes(speed);

    if (total)
      return ` |${bar} ${percent}% | ETA: ${eta} | ${value} | ${speedTxt}/s`;

    return `#${id} |${bar} ${percent}% | ${speedTxt}/s${
      groupEnd ? ` | Chunk #${groupStart}-${groupEnd}` : ''
    }`;
  },
});

/**
 * @param {import('./context.js').Context} ctx
 * @param {{ [platform: string]: { [architecture: string]: string } }} fileMap
 * @returns {string}
 */
function getBinaryUrl(ctx, fileMap) {
  if (!Object.prototype.hasOwnProperty.call(fileMap, ctx.platform.name)) {
    throw new Error(
      `platform ${
        ctx.platform.name
      } is not supported; supported platforms are: ${Object.keys(fileMap).join(
        ', ',
      )}`,
    );
  }
  const archs = fileMap[ctx.platform.name];

  if (!Object.prototype.hasOwnProperty.call(archs, ctx.architecture.name)) {
    throw new Error(
      `architecture ${ctx.architecture.name} is not supported for platform ${
        ctx.platform.name
      }; supported architectures are: ${Object.keys(archs).join(', ')}`,
    );
  }
  const fileName = archs[ctx.architecture.name];

  return BASE_URL + '/' + ctx.godotVersion + '/' + fileName;
}

/**
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<string|undefined>}
 */
async function createDownloadDir(ctx) {
  return mkdirp(path.dirname(ctx.downloadPath));
}

/**
 * @param {import('./context.js').Context} ctx
 * @returns {Promise<import('./context.js').Context>}
 */
async function download(ctx) {
  await createDownloadDir(ctx);

  const binaryUrl = getBinaryUrl(ctx, godotFileMap);

  const cpusCount = os.cpus()?.length || 1;
  const connections = Math.min(
    EventEmitter.defaultMaxListeners,
    cpusCount / 2 > 1 ? cpusCount / 2 : 2,
  );
  const existBehavior = 'ignore';

  let error = null;
  const friendlyFileName = path.posix.basename(binaryUrl);

  await new EasyDL(binaryUrl, ctx.downloadPath, {
    reportInterval: 300,
    chunkSize: size => {
      return Math.min(size / 5, 10 * 1024 * 1024);
    },
    connections,
    existBehavior,
  })
    .on('metadata', ({ chunks, size }) => {
      multibar.create(0, 0, {
        text: `Downloading ${friendlyFileName} ${
          size ? `(${formatBytes(size)}) ` : ''
        }...`,
      });

      if (chunks.length > 10) {
        const groupSize = Math.floor(chunks.length / 10);
        const rem = chunks.length % 10;
        let k = 0;

        for (let i = 0; i < 10; i += 1) {
          let n = i < rem ? groupSize + 1 : groupSize;
          let bytes = 0;
          const groupStart = k;

          for (let j = 0; j < n; j += 1) {
            bytes += chunks[k];
            k += 1;
          }

          refProgress.push(
            multibar.create(bytes, 0, {
              id: i,
              speed: 0,
              groupStart,
              groupEnd: k,
            }),
          );
        }
      } else {
        for (let i = 0; i < chunks.length; i += 1) {
          refProgress.push(multibar.create(chunks[i], 0, { id: i, speed: 0 }));
        }
      }

      multibar.create(0, 0, { text: ' ' });
      multibar.create(0, 0, { text: 'TOTAL' });
      refProgress.push(multibar.create(size, 0, { total: true, speed: 0 }));
      multibar.create(0, 0, { text: ' ' });
    })
    .on('progress', ({ total, details }) => {
      if (details.length > 10) {
        const groupSize = Math.floor(details.length / 10);
        const rem = details.length % 10;
        let k = 0;

        for (let i = 0; i < 10; i += 1) {
          let n = i < rem ? groupSize + 1 : groupSize;
          let bytes = 0;
          let totalSpeed = 0;
          const groupStart = k;

          for (let j = 0; j < n; j += 1) {
            bytes += details[k].bytes;
            totalSpeed += details[k].speed;
            k += 1;
          }

          refProgress[i].update(bytes, {
            id: i,
            speed: totalSpeed,
            groupStart,
            groupEnd: k,
          });
        }
      } else {
        for (let i = 0; i < details.length; i += 1) {
          const detail = details[i];
          refProgress[i].update(detail.bytes, {
            id: i,
            speed: detail.speed,
          });
        }
      }

      refProgress[refProgress.length - 1].update(total.bytes, {
        total: true,
        speed: total.speed,
      });
    })
    .on('error', err => {
      error = err;
    })
    .wait();

  multibar.stop();

  return error ? Promise.reject(error) : Promise.resolve(ctx);
}

export default download;
