import os from 'os';

class Platform {
  static LINUX = new Platform('linux');
  static OSX = new Platform('osx');
  static WINDOWS = new Platform('windows');

  name;

  constructor(name) {
    this.name = name;
  }

  toString() {
    return `Platform.${this.name}`;
  }

  static fromOsPlatform() {
    const osPlatform = os.platform();

    switch (osPlatform) {
      case 'linux':
      case 'cygwin':
        return Platform.LINUX;

      case 'darwin':
        return Platform.OSX;

      case 'win32':
        return Platform.WINDOWS;

      default:
        throw new Error(`platform ${osPlatform} is not supported`);
    }
  }
}

export default Platform;
