////////////////////////////////////////////////////////////////////////////////
export class HashSet<T> /*implements Set<T>*/ {
  protected map = new Map<string, T>()

  constructor(protected hasher: (value: T) => string = JSON.stringify, source?: Iterable<T>) {
    if (source) {
      for (let value of source) {
        this.add(value)
      }
    }
  }

  get size() {
    return this.map.size
  }

  add(value: T) {
    this.map.set(this.hasher(value), value)
    return this
  }

  addAll(values: Iterable<T>) {
    for (let value of values) {
      this.add(value)
    }
    return this
  }

  clear() {
    this.map.clear()
  }

  delete(value: T) {
    return this.map.delete(this.hasher(value))
  }

  *entries() {
    for (let entry of this.map.entries()) {
      yield [entry[1], entry[1]] as [T, T]
    }
  }

  *hashEntries() {
    yield* this.map.entries()
  }

  keys() {
    return this.values()
  }

  forEach(callback: (value: T, key: T, set: HashSet<T>) => any, thisArg?) {
    for (let value of this) {
      callback.call(thisArg, value, value, this)
    }
  }

  has(value: T) {
    return this.map.has(this.hasher(value))
  }

  values() {
    return this.map.values()
  }

  [Symbol.iterator]() {
    return this.values()
  }
}

////////////////////////////////////////////////////////////////////////////////
export interface IMap<K, V> {
  has(key: K): boolean
  get(key: K): V
  set(key: K, val: V): IMap<K, V>
  [Symbol.iterator]()
}

//------------------------------------------------------------------------------
export class JsonCompareMap<K, V> implements IMap<K, V> {
  map = new Map<string, [K, V]>()

  constructor() { }

  has(key: K) {
    return this.map.has(JSON.stringify(key))
  }

  get(key: K) {
    let pair = this.map.get(JSON.stringify(key))
    if (pair) {
      return pair[1]
    }
  }

  set(key: K, val: V) {
    this.map.set(JSON.stringify(key), [key, val])
    return this
  }

  [Symbol.iterator]() {
    throw new Error('Not impemented') // todo
  }
}

////////////////////////////////////////////////////////////////////////////////
export class NumeratedSet<T> {  // todo move somewhere
  values = new Array<T>()
  ids: IMap<T, number>

  static fromUniqueArray(array: Array<any>) {
    let ret = new NumeratedSet()
    ret.values = array
    for (let i = 0; i < array.length; ++i) {
      ret.ids.set(array[i], i)
    }

    return ret
  }

  static fromSet(set: Set<any>) {
    let ret = new NumeratedSet()
    for (let val of set) {
      ret.ids.set(val, ret.values.push(val) - 1)
    }

    return ret
  }

  constructor(mapConstructor: { new(): IMap<T, number> } = Map) {
    this.ids = new mapConstructor()
  }

  add(...vals: Array<T>) {
    for (let val of vals) {
      if (!this.ids.has(val)) {
        this.ids.set(val, this.values.push(val) - 1)
      }
    }

    return this
  }

  id(val: T) {
    return this.ids.get(val)
  }
}

////////////////////////////////////////////////////////////////////////////////
export class CachedFunctionResult<T> {
  private value: T
  private argsHash: string = undefined

  constructor(private calculator: (...args) => T) {

  }

  get(...args) {
    let hash = JSON.stringify(args)
    if (this.isInvalid() || (args && args.length && hash !== this.argsHash)) {
      this.value = this.calculator(...args)
    }
    this.argsHash = hash

    return this.value
  }

  invalidate() {
    this.argsHash = undefined
  }

  private isInvalid() {
    return this.argsHash === undefined
  }
}

//////////////////////////////////////////////////////////////////////////////////
export class DefaultMap<K, V> extends Map<K, V> {
  constructor(
    private v: { new(): V; },
    iterable?: Iterable<[K, V]>,
  ) {
    super(iterable)
  }

  get(key: K) {
    if (!super.has(key)) {
      let ret = new this.v()
      super.set(key, ret)
      return ret
    }

    return super.get(key)
  }

  getRaw(key: K) {
    return super.get(key)
  }
}

//////////////////////////////////////////////////////////////////////////////////
export class CoolSet<T> extends Set<T> {
  addAll(iterable: Iterable<T>) {
    for (let val of iterable) {
      this.add(val)
    }
  }
}
