////////////////////////////////////////////////////////////////////////////////
export class Dictionary {
  private _rootIndex = 0;
  
  constructor(private _units: Uint32Array) {}

  has(bytes: Iterable<number>): boolean {
    let index = this.followBytes(bytes);
    
    return index !== null && Unit.hasLeaf(this._units[index]);
  }
  
  hasValue(index: number) {
    return Unit.hasLeaf(this._units[index]);
  }
  
  value(index: number) {
    return Unit.value(this._units[index ^ Unit.offset(this._units[index])]);
  }
  
  followBytes(bytes: Iterable<number>, index = this._rootIndex) {
    for (let byte of bytes) {
      if ((index = this.followByte(byte, index)) === null) {
        return null;
      }
    }
    
    return index;
  }

  followByte(label: number, index: number) {
    let offset = Unit.offset(this._units[index]);
    let nextIndex = index ^ offset ^ label;
    if (Unit.label(this._units[nextIndex]) !== label) {
      return null;
    }

    return nextIndex;
  }
}


//------------------------------------------------------------------------------
namespace Unit {
  const OFFSET_MAX = 1 << 21;
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
