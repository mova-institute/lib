import { Dict } from './types'



////////////////////////////////////////////////////////////////////////////////
export const r = String.raw

////////////////////////////////////////////////////////////////////////////////
export function buildObject<ValueType>(kevalues: [string, ValueType][]) {
  let ret = {} as Dict<ValueType>
  for (let [key, value] of kevalues) {
    ret[key] = value
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function match(str: string, re: RegExp) {
  let ret = str.match(re)
  if (ret) {
    return ret as Array<string>
  }
  return []
}

////////////////////////////////////////////////////////////////////////////////
export function matchNth(str: string, re: RegExp, n: number) {
  let match = str.match(re)
  if (match) {
    return match[n]
  }
}

////////////////////////////////////////////////////////////////////////////////
export function matchAll(str: string, re: RegExp) {
  let ret: RegExpExecArray[] = []

  let match: RegExpExecArray | null
  while (match = re.exec(str)) {
    ret.push(match)
  }

  return ret
}


////////////////////////////////////////////////////////////////////////////////
export function arrayed(value: any | any[]) {
  if (Array.isArray(value)) {
    return value
  }
  if (value === undefined) {
    return []
  }
  return [value]
}

////////////////////////////////////////////////////////////////////////////////
export function last<T>(array: Array<T>) {
  return array[array.length - 1]
}

////////////////////////////////////////////////////////////////////////////////
export function wrappedOrNull<T>(construct: { new(val): T; }, val) {
  return val ? new construct(val) : null
}

////////////////////////////////////////////////////////////////////////////////
/*export function countGenerated<T>(generator: Iterator<T>) {
  let i = 0
  while (!generator.next().done) {
    ++i
  }

  return i
}*/

////////////////////////////////////////////////////////////////////////////////
/*export function ithGenerated<T>(generator: Iterator<T>, index: number) {
  let cur = generator.next()
  while (index-- && !cur.done) {
    cur = generator.next()
  }

  return cur.value
}*/

////////////////////////////////////////////////////////////////////////////////
export function complement<T>(a: Set<T>, b: Set<T>) {
  return new Set([...a].filter(x => !b.has(x)))
}

////////////////////////////////////////////////////////////////////////////////
export function sleep(ms = 0) {
  // todo
  return new Promise<never>(resolve => setTimeout(() => resolve(), ms))
}

////////////////////////////////////////////////////////////////////////////////
export function isOddball(value) {
  return value === undefined || value === null
}

////////////////////////////////////////////////////////////////////////////////
export function isString(value) {
  return typeof value === 'string'
}

////////////////////////////////////////////////////////////////////////////////
export function isNumber(value) {
  return typeof value === 'number'
}

////////////////////////////////////////////////////////////////////////////////
export function isObject(value) {
  return typeof value === 'object'
}

////////////////////////////////////////////////////////////////////////////////
export function isIterable(thing) {
  return typeof thing[Symbol.iterator] === 'function'
}

////////////////////////////////////////////////////////////////////////////////
export function assureIterable<T>(thing: T | Iterable<T>) {
  if (isIterable(thing)) {
    return thing as Iterable<T>
  }
  return [thing] as Iterable<T>
}

////////////////////////////////////////////////////////////////////////////////
export function* zipLongest<T>(...iterables: Iterable<T>[]) {
  let iterators = iterables.map(x => x[Symbol.iterator]())

  for (let state = iterators.map(x => x.next());
    state.some(x => !x.done);
    state = iterators.map(x => x.next())) {

    yield state.map(x => x.done ? undefined : x.value)
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* zip<T>(...iterables: Iterable<T>[]) {
  let iterators = iterables.map(x => x[Symbol.iterator]())

  let toyield: T[] = []
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

////////////////////////////////////////////////////////////////////////////////
/** class decorator, see http://www.typescriptlang.org/docs/handbook/mixins.html */
export function mixin(...baseCtors: any[]) {
  return derivedCtor => {
    baseCtors.forEach(baseCtor => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
        Object.defineProperty(derivedCtor.prototype, name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name))
      })
    })
  }
}

////////////////////////////////////////////////////////////////////////////////
/*export function strlen(str: string) {
  return countGenerated(str[Symbol.iterator]())
}*/

////////////////////////////////////////////////////////////////////////////////
export function createObject2(keys: string[], values: any[]) {
  let ret = {}
  let i = 0
  for (let key of keys) {
    ret[key] = values[i++]
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function makeObject<T>(keyvaluePairs: [string, T][]) {
  let ret: { [key: string]: T } = {}
  for (let [key, value] of keyvaluePairs) {
    ret[key] = value
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function parseIntStrict(str: string) {
  if (/^-?\d+$/.test(str)) {
    return Number(str)
  }
  throw new Error(`Not a number string: "${str}"`)
}
