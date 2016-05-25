////////////////////////////////////////////////////////////////////////////////
export class JsonCompareSet<T> {
  private _map = new Map<string, T>();

  constructor(iterable?: Iterable<T>) {
    //super(iterable);  // todo
  }

  add(value: T) {
    this._map.set(JSON.stringify(value), value);
    return this;
  }

  keys() {
    return this._map.values();
  }

  values() {
    return this._map.values();
  }
}

////////////////////////////////////////////////////////////////////////////////
export interface IMap<K, V> {
  has(key: K): boolean;
  get(key: K): V;
  set(key: K, val: V): IMap<K, V>;
  [Symbol.iterator]();
}

//------------------------------------------------------------------------------
export class JsonCompareMap<K, V> implements IMap<K, V> {
  map = new Map<string, [K, V]>();

  constructor() { }

  has(key: K) {
    return this.map.has(JSON.stringify(key));
  }

  get(key: K) {
    return this.map.get(JSON.stringify(key))[1];
  }

  set(key: K, val: V) {
    this.map.set(JSON.stringify(key), [key, val]);
    return this;
  }

  [Symbol.iterator]() {
    throw new Error('Not impemented'); // todo
  }
}

////////////////////////////////////////////////////////////////////////////////
export class NumeratedSet<T> {  // todo move somewhere
  values = new Array<T>();
  ids: IMap<T, number>;

  static fromUniqueArray(array: Array<any>) {
    let ret = new NumeratedSet();
    ret.values = array;
    for (let i = 0; i < array.length; ++i) {
      ret.ids.set(array[i], i);
    }

    return ret;
  }

  static fromSet(set: Set<any>) {
    let ret = new NumeratedSet();
    for (let val of set) {
      ret.ids.set(val, ret.values.push(val) - 1);
    }

    return ret;
  }

  constructor(mapConstructor: { new (): IMap<T, number> } = Map) {
    this.ids = new mapConstructor();
  }

  add(...vals: Array<T>) {
    for (let val of vals) {
      if (!this.ids.has(val)) {
        this.ids.set(val, this.values.push(val) - 1);
      }
    }

    return this;
  }

  id(val: T) {
    return this.ids.get(val);
  }
}

////////////////////////////////////////////////////////////////////////////////
export class CachedValue<T> {
  private _value: T;
  private _argsHash: string = null;

  constructor(private _calculator: (...args) => T) {

  }

  get(...args) {
    let hash = JSON.stringify(args);
    if (this._isInvalid() || (args && args.length && hash !== this._argsHash)) {
      this._value = this._calculator(...args);
    }
    this._argsHash = hash;

    return this._value;
  }

  invalidate() {
    this._argsHash = null;
  }

  private _isInvalid() {
    return this._argsHash === null;
  }
}

// todo: bring inheritance version back when es6 minifier comes out
// ////////////////////////////////////////////////////////////////////////////////
// export class DefaultMap<K, V> extends Map<K, V> {
//   constructor(
//     private _v: { new (): V; },
//     iterable?: Iterable<[K, V]>) {

//     super(iterable);
//   }

//   get(key: K) {
//     let ret = super.get(key);
//     if (!ret) {
//       ret = new this._v();
//       super.set(key, ret);
//     }

//     return ret;
//   }
// }

////////////////////////////////////////////////////////////////////////////////
export class DefaultMap<K, V> {
  private _map: Map<K, V>;

  constructor(private _v: { new (): V; }, iterable?: Iterable<[K, V]>) {
    this._map = new Map<K, V>(iterable);
  }

  get(key: K) {
    let ret = this._map.get(key);
    if (!ret) {
      ret = new this._v();
      this._map.set(key, ret);
    }

    return ret;
  }

  [Symbol.iterator]() {
    return this._map[Symbol.iterator]();
  }
}
