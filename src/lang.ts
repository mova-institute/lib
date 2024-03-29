import { Dict } from './types'

export const r = String.raw

export function tuple<T extends Array<any>>(...data: T) {
  return data
}

export function o() {
  return {} as any
}

export function chainFuncs<T>(functs: Iterable<(a: T) => T>) {
  return (a: T) => {
    for (let f of functs) {
      a = f(a)
    }
    return a
  }
}

export function safe<T extends Object>(obj: T) {
  return new Proxy(obj, {
    get(target, name) {
      const result = target[name]
      if (result) {
        return result instanceof Object ? safe(result) : result
      }
      return safe({})
    },
  })
}

export function buildObject<ValueType>(
  kevalues: Iterable<[string, ValueType]>,
) {
  let ret = {} as Dict<ValueType>
  for (let [key, value] of kevalues) {
    ret[key] = value
  }
  return ret
}

export function buildMap<KeyType, ValueType>(
  kevalues: Iterable<[KeyType, ValueType]>,
) {
  let ret = new Map<KeyType, ValueType>()
  for (let [key, value] of kevalues) {
    ret.set(key, value)
  }
  return ret
}

export function renprop(obj: any, oldName: string, newName: string) {
  obj[newName] = obj[oldName]
  delete obj[oldName]
}

export function renpropIfExists(obj: any, oldName: string, newName: string) {
  if (oldName in obj) {
    renprop(obj, oldName, newName)
  }
}

export function match(str: string, re: RegExp) {
  let ret = str.match(re)
  if (ret) {
    return ret as Array<string>
  }
  return []
}

export function matchGroup(str: string, re: RegExp, n = 1) {
  let match = str.match(re)
  if (match) {
    return match[n]
  }
}

export function arrayed<T>(value: T | Array<T>) {
  if (Array.isArray(value)) {
    return value
  }
  if (value === undefined) {
    return []
  }
  return [value]
}

export function last<T>(array: Array<T>) {
  return array[array.length - 1]
}

export function ibool(value: any) {
  return value ? 1 : 0
}

export function wrappedOrNull<T>(construct: new (val) => T, val) {
  return val ? new construct(val) : null
}

export function* enumerate<T>(iterable: Iterable<T>) {
  let i = 0
  for (let v of iterable) {
    yield [i++, v] as [number, T]
  }
}

export async function* enumerateAsync<T>(iterable: AsyncIterable<T>) {
  let i = 0
  for await (let v of iterable) {
    yield [i++, v] as [number, T]
  }
}

export async function* flattenAsync<T>(
  iterable: AsyncIterable<Iterable<T> | AsyncIterable<T>>,
) {
  for await (let v of iterable) {
    yield* v
  }
}

export function complement<T>(a: Set<T>, b: Set<T>) {
  return new Set([...a].filter((x) => !b.has(x)))
}

export function sleep(ms = 0) {
  // todo
  return new Promise<never>((resolve) => setTimeout(resolve, ms))
}

export function isOddball(value) {
  return value === undefined || value === null
}

export function isString(value) {
  return typeof value === 'string'
}

export function isNumber(value) {
  return typeof value === 'number'
}

export function isObject(value) {
  return typeof value === 'object'
}

export function isIterable(thing) {
  return typeof thing[Symbol.iterator] === 'function'
}

export function assureIterable<T>(thing: T | Iterable<T>) {
  if (isIterable(thing)) {
    return thing as Iterable<T>
  }
  return [thing] as Iterable<T>
}

export function* zipLongest<T>(...iterables: Array<Iterable<T>>) {
  let iterators = iterables.map((x) => x[Symbol.iterator]())

  for (
    let state = iterators.map((x) => x.next());
    state.some((x) => !x.done);
    state = iterators.map((x) => x.next())
  ) {
    yield state.map((x) => (x.done ? undefined : x.value))
  }
}

export function* zip<T>(...iterables: Array<Iterable<T>>) {
  let iterators = iterables.map((x) => x[Symbol.iterator]())

  let toyield: Array<T> = []
  while (true) {
    for (let it of iterators) {
      let { done, value } = it.next()
      if (done) {
        return
      }
      toyield.push(value)
    }
    yield toyield
    toyield = []
  }
}

/** class decorator, see http://www.typescriptlang.org/docs/handbook/mixins.html */
export function mixin(...baseCtors: Array<any>) {
  return (derivedCtor) => {
    baseCtors.forEach((baseCtor) => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach((name) => {
        Object.defineProperty(
          derivedCtor.prototype,
          name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name),
        )
      })
    })
  }
}

/*export function strlen(str: string) {
  return countGenerated(str[Symbol.iterator]())
}*/

export function createObject2(keys: Array<string>, values: Array<any>) {
  let ret = {}
  let i = 0
  for (let key of keys) {
    ret[key] = values[i++]
  }
  return ret
}

export function makeObject<T>(keyvaluePairs: Array<[string, T]> /* todo */) {
  let ret: Record<string, T> = {}
  for (let [key, value] of keyvaluePairs) {
    ret[key] = value
  }

  return ret
}

export function parseIntStrict(str: string) {
  if (/^-?\d+$/.test(str)) {
    return Number(str)
  }
  throw new Error(`Not a number string: "${str}"`)
}

export function wiith<TValue, TRet>(value: TValue, f: (value: TValue) => TRet) {
  return f(value)
}

export function wiithNonempty<TValue, TRet>(
  value: TValue,
  f: (value: TValue) => TRet,
) {
  if (value) {
    return f(value)
  }
}

export function mapInplace<T>(
  array: Array<T>,
  maps: ((element: T) => T) | Array<(element: T) => T>, // test
  start = 0,
) {
  for (let i = start; i < array.length; ++i) {
    for (let f of arrayed(maps)) {
      array[i] = f(array[i])
    }
  }
  return array
}

export function flip(value, a, b) {
  if (value === a) {
    return b
  }
  if (value === b) {
    return a
  }

  throw new Error(`Value ${value} is neither ${a} nor ${b}`)
}

export function shallowEqualArrays<T>(arrA: Array<T>, arrB: Array<T>) {
  if (arrA === arrB) {
    return true
  }

  if (arrB.length !== arrB.length) {
    return false
  }

  for (let i = 0; i < arrB.length; ++i) {
    if (arrA[i] !== arrB[i]) {
      return false
    }
  }

  return true
}

export function shallowEqualObj(a: object, b: object) {
  if (a === b) {
    return true
  }

  if (!a || !b) {
    return false
  }

  for (let key in a) {
    if (!(key in b) || a[key] !== b[key]) {
      return false
    }
  }

  for (let key in b) {
    if (!(key in a)) {
      return false
    }
  }

  return true
}

export function logError(value) {
  console.log(value)
}
