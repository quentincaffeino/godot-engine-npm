import path from 'path';

import { parse } from 'semver';

import Platform from './platform.js';
import Architecture from './architecture.js';

const DOWNLOAD_PATH = './download/godot.zip';
const BIN_PATH = './bin';

export class Context {
  /**
   * @type {import('semver').SemVer}
   */
  pkgVersion;

  /**
   * @type {number}
   */
  pkgSubpatch;

  /**
   * @type {string}
   */
  godotVersion;

  /**
   * @type {string}
   */
  platform;

  /**
   * @type {string}
   */
  architecture;

  /**
   * @type {string}
   */
  downloadPath = path.resolve(DOWNLOAD_PATH);

  /**
   * @type {string}
   */
  binPath = path.resolve(BIN_PATH);

  /**
   * @param {{ version: string }} pkg
   */
  constructor(pkg) {
    [this.pkgVersion, this.pkgSubpatch] = Context.parsePkgVersionString(
      pkg.version,
    );
    this.godotVersion = Context.convertSemverToGodotVersion(
      this.pkgVersion,
      this.pkgSubpatch,
    );

    this.platform = Platform.fromOsPlatform();
    this.architecture = Architecture.fromOsArch();
  }

  /**
   * @param {string} pkgVersion
   * @returns {[import('semver').SemVer, number]}
   */
  static parsePkgVersionString(pkgVersion) {
    // for some reason godot devs used subpatch in the past so we need to
    // account for that as semver cannot parse this format
    const regex = /^(?<version>\d+\.\d+\.\d+)(?<subpatch>\.\d+)?(?<rest>.*)?/g;
    const matches = regex.exec(pkgVersion);
    let subpatch = null;
    if (Array.isArray(matches)) {
      // replace original version
      const versionMatch = matches.groups?.version;
      const restMatch = matches.groups?.rest;
      if (
        typeof versionMatch === 'string' &&
        versionMatch.length &&
        typeof restMatch === 'string'
      ) {
        pkgVersion = versionMatch + restMatch;
      }

      const subpatchMatch = matches.groups?.subpatch;
      if (typeof subpatchMatch === 'string' && subpatchMatch.length) {
        subpatch = parseInt(subpatchMatch?.substring(1), 10);
      }
    }

    const version = parse(pkgVersion);
    if (!version) {
      throw new Error('failed to parse package version: ' + pkgVersion);
    }

    return [version, subpatch];
  }

  /**
   *
   * @param {import('semver').SemVer} semver
   * @param {number|null} subpatch
   * @returns {string}
   */
  static convertSemverToGodotVersion(semver, subpatch) {
    const versionNumbers = [semver.major, semver.minor, semver.patch];

    if (typeof subpatch === 'number') {
      versionNumbers.push(subpatch);
    }

    if (versionNumbers[versionNumbers.length - 1] === 0) {
      versionNumbers.pop();
    }

    let version = versionNumbers.join('.');

    if (semver.prerelease.length) {
      version += '/' + semver.prerelease.join('.');
    }

    return version;
  }
}
