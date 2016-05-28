export class Dictionary {
  constructor(private units: Uint32Array) {
  }

  has(bytes: Iterable<number>): boolean {
    let index = this.followBytes(bytes);

    return index !== null && Unit.hasLeaf(this.units[index]);
  }

  hasValue(index: number) {
    return Unit.hasLeaf(this.units[index]);
  }

  value(index: number) {
    return Unit.value(this.units[index ^ Unit.offset(this.units[index])]);
  }

  followBytes(bytes: Iterable<number>, index = 0) {
    for (let byte of bytes) {
      if ((index = this.followByte(byte, index)) === null) {
        return null;
      }
    }

    return index;
  }

  followByte(label: number, index: number) {
    let offset = Unit.offset(this.units[index]);
    let nextIndex = index ^ offset ^ label;
    if (Unit.label(this.units[nextIndex]) !== label) {
      return null;
    }

    return nextIndex;
  }
}

namespace Unit {
  const IS_LEAF_BIT = 1 << 31;
  const HAS_LEAF_BIT = 1 << 8;
  const EXTENSION_BIT = 1 << 9;

  export function hasLeaf(unit: number) {
    return (unit & HAS_LEAF_BIT) ? true : false;
  }

  export function value(unit: number) {
    return unit & ~HAS_LEAF_BIT;
  }

  export function offset(unit: number) {
    return (unit >>> 10) << ((unit & EXTENSION_BIT) >>> 6);
  }

  export function label(unit: number) {
    return unit & (IS_LEAF_BIT | 0xFF);
  }
}
