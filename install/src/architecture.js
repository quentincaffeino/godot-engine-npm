import os from 'os';

class Architecture {
  static x32 = new Architecture('32');
  static x64 = new Architecture('64');

  name;

  constructor(name) {
    this.name = name;
  }

  toString() {
    return `Architecture.${this.name}`;
  }

  static fromOsArch() {
    const osArch = os.arch();

    switch (osArch) {
      case 'x32':
        return Architecture.x32;

      case 'x64':
        return Architecture.x64;

      default:
        throw new Error(`arch ${osArch} is not supported`);
    }
  }
}

export default Architecture;
