import { isOddball, isNumber } from './lang'
import { HashSet } from './data_structures'  // todo remove dep


////////////////////////////////////////////////////////////////////////////////
export type Comparator<T> = (a: T, b: T) => number

////////////////////////////////////////////////////////////////////////////////
export function compare(a, b) {
  if (isOddball(a) && !isOddball(b)) {
    return -1
  }

  if (!isOddball(a) && isOddball(b)) {
    return 1
  }

  if (isNumber(a) && isNumber(b)) {
    return numericCompare(a, b)
  }

  return lexCompare(a, b)
}

////////////////////////////////////////////////////////////////////////////////
export function numericCompare(a: number, b: number) {
  return a - b
}

////////////////////////////////////////////////////////////////////////////////
export function chainComparators<T>(...comparators: Comparator<T>[]) {
  return (a: T, b: T) => {
    for (let comparator of comparators) {
      let ret = comparator(a, b)
      if (ret) {
        return ret
      }
    }
    return 0
  }
}

////////////////////////////////////////////////////////////////////////////////
export function comparatorBy<ArgT, CompT>(
  comparator: Comparator<CompT>, transformation: (a: ArgT) => CompT) {
  return (a: ArgT, b: ArgT) => comparator(transformation(a), transformation(b))
}

////////////////////////////////////////////////////////////////////////////////
export function lexCompare(a, b) {
  return String(a).localeCompare(String(b))
}

////////////////////////////////////////////////////////////////////////////////
export function indexComparator<T>(array: T[]) {
  let indexMap = arr2indexMap(array)
  return (a: T, b: T) => indexMap.get(a) - indexMap.get(b)
}

////////////////////////////////////////////////////////////////////////////////
export function stableSort<T>(array: T[], comparator: (a: T, b: T) => number = lexCompare) {
  let stableComparator = chainComparators(comparator, indexComparator(array))
  return array.sort(stableComparator)
}

////////////////////////////////////////////////////////////////////////////////
export function flipMap<K, V>(map: Map<K, V>) {
  let ret = new Map<V, K>()
  map.forEach((v, k) => ret.set(v, k))
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function uniqValuedMap2array(map) {
  return Object.keys(map).sort((a, b) => {
    return map[a] - map[b]
  })
}

////////////////////////////////////////////////////////////////////////////////
export function* findIndexwiseDiff(input: Array<any>) {
  let maxLen = Math.max(...input.map(x => x.length))
  let curDiffLen = 0
  for (let j = 0; j < maxLen; ++j) {
    let cur = input[0][j]
    for (let i = 1; i < input.length; ++i) {
      if (input[i][j] !== cur) {
        ++curDiffLen
        break
      }
      if (curDiffLen) {
        yield [j - curDiffLen, curDiffLen]
        curDiffLen = 0
      }
    }
  }
  if (curDiffLen) {
    yield [maxLen - curDiffLen, curDiffLen]
  }
}

////////////////////////////////////////////////////////////////////////////////
export function longestCommonSubstring(strings: Array<string>) {  // naive
  let ret = ''
  if (strings.length) {
    for (let i = 0; i < strings[0].length; ++i) {
      for (let j = 0; j < strings[0].length - i + 1; ++j) {
        let candidate = strings[0].substring(i, i + j)
        if (j > ret.length && strings.every(x => x.indexOf(candidate) >= 0)) {
          ret = candidate
        }
      }
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function groupTableBy<T>(table: T[], groupProp: string | number | symbol) {
  let ret = new Map<string | number | symbol, T[]>()

  for (let row of table) {
    let cell = row[groupProp]
    let pushIn = ret.get(cell) || ret.set(cell, []).get(cell)
    pushIn!.push(row)
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function indexTableByColumns(table: Object[], propNames: any[]) {
  let ret = new Map()

  for (let row of table) {
    if (propNames[propNames.length - 1] in row) {
      let cur = ret
      for (let i = 0, bound = propNames.length - 1; i < bound; ++i) {
        let col = propNames[i]
        let cell = row[col]
        cur = cur.get(cell) || cur.set(cell, new Map()).get(cell)
      }
      cur.set(row[propNames[propNames.length - 1]], row)
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function arr2indexMap<T>(value: Array<T>) {
  let ret = new Map<T, number>()
  for (let i = 0; i < value.length; ++i) {
    ret.set(value[i], i)
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function arr2indexObj<T>(value: Array<string>, shift = 0) {
  let ret = {} as { [index: string]: number }
  for (let i = 0; i < value.length; ++i) {
    ret[value[i]] = i + shift
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function combinations<T>(arr: T[][]) {
  return [..._combinations(arr)]
}

function* _combinations<T>(arr: T[][], state = new Array<T>()): Iterable<T[]> {
  if (state.length < arr.length) {
    for (let x of arr[state.length]) {
      state.push(x)
      yield* _combinations(arr, state)
      state.pop()
    }
  }
  else {
    yield [...state]
  }
}

////////////////////////////////////////////////////////////////////////////////
export function overflowNegative(value: number) {
  return value & 0x7FFFFFFF  // todo: MAX_SAFE_INTEGER?
}

////////////////////////////////////////////////////////////////////////////////
export function uniq<T>(array: T[]) {
  if (array.length === 1) {
    return array
  }
  return [...new Set(array)]
}

////////////////////////////////////////////////////////////////////////////////
export function uniqueSmall(array: any[]) {
  return array.filter((x, i) => array.indexOf(x) === i)
}

////////////////////////////////////////////////////////////////////////////////
export function uniqueJson<T>(iterable: Iterable<T>) {
  return [...new HashSet<T>().addAll(iterable)]
}

////////////////////////////////////////////////////////////////////////////////
export function* findAllIndexes<T>(iterable: Iterable<T>, predicate: (value: T) => boolean) {
  let i = 0
  for (let value of iterable) {
    if (predicate(value)) {
      yield i++
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function findStringDiffIndexes(str1: string, str2: string) {
  let maxLen = Math.max(str1.length, str2.length)
  let ret = new Array<number>()
  for (let i = 0; i < maxLen; ++i) {
    if (str1.charCodeAt(i) !== str2.charCodeAt(i)) {
      ret.push(i)
    }
  }
  return ret
}
