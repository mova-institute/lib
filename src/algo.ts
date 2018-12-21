import { isOddball, isNumber, last } from './lang'
import { HashSet } from './data_structures'  // todo remove dep
import { Dict, Predicate, Comparator } from './types'



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
    return compareAscending(a, b)
  }

  return lexCompare(a, b)
}

////////////////////////////////////////////////////////////////////////////////
export function compareAscending(a: number, b: number) {
  return a - b
}

////////////////////////////////////////////////////////////////////////////////
export function chainComparators<T>(...comparators: Array<Comparator<T>>) {
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
export function indexComparator<T>(array: Array<T>) {
  let indexMap = arr2indexMap(array)
  return (a: T, b: T) => indexMap.get(a) - indexMap.get(b)
}

////////////////////////////////////////////////////////////////////////////////
export function stableSort<T>(
  array: Array<T>,
  comparator = lexCompare,
  ...comparators: Array<Comparator<T>>
) {
  let stableComparator = chainComparators(comparator, ...comparators, indexComparator(array))
  return array.sort(stableComparator)
}

////////////////////////////////////////////////////////////////////////////////
export function flipObjMap(map: Dict<string>) {
  let ret = {}
  Object.entries(map).forEach(([k, v]) => ret[v] = k)
  return ret
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
export function groupTableBy<T>(table: Array<T>, groupProp: string | number | symbol) {
  let ret = new Map<string | number | symbol, Array<T>>()

  for (let row of table) {
    let cell = row[groupProp]
    let pushIn = ret.get(cell) || ret.set(cell, []).get(cell)
    pushIn.push(row)
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function indexTableByColumn<T>(table: Array<T>, propName: string) {
  return new Map(table.map(x => [x[propName], x] as [string, T]))
}

////////////////////////////////////////////////////////////////////////////////
export function indexTableByColumns(table: Array<Object>, propNames: Array<any>) {
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
export function combinations<T>(arr: Array<Array<T>>) {
  return [..._combinations(arr)]
}

function* _combinations<T>(arr: Array<Array<T>>, state = new Array<T>()): Iterable<Array<T>> {
  if (state.length < arr.length) {
    for (let x of arr[state.length]) {
      state.push(x)
      yield* _combinations(arr, state)
      state.pop()
    }
  } else {
    yield [...state]
  }
}

////////////////////////////////////////////////////////////////////////////////
export function overflowNegative(value: number) {
  return value & 0x7FFFFFFF  // todo: MAX_SAFE_INTEGER?
}

////////////////////////////////////////////////////////////////////////////////
export function uniq<T>(array: Array<T>) {
  if (array.length === 1) {
    return array
  }
  return [...new Set(array)]
}

////////////////////////////////////////////////////////////////////////////////
export function uniqSmall(array: Array<any>) {
  return array.filter((x, i) => array.indexOf(x) === i)
}

////////////////////////////////////////////////////////////////////////////////
export function uniqJson<T>(iterable: Iterable<T>) {
  return [...new HashSet<T>().addAll(iterable)]
}

////////////////////////////////////////////////////////////////////////////////
export function* findAllIndexes<T>(
  iterable: Iterable<T>,
  predicate: (value: T, index: number) => boolean,
) {
  let i = 0
  for (let value of iterable) {
    if (predicate(value, i)) {
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

////////////////////////////////////////////////////////////////////////////////
export function commonPrefixLen2(a: string, b: string) {
  if (a === b) {
    return a.length
  }

  let ret = 0
  while (a[ret] === b[ret]) {
    ++ret
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function commonPrefixLen(strings: Array<string>) {
  let minLen = Math.min(...strings.map(x => x.length))

  outer: for (var ret = 0; ret < minLen; ++ret) {
    for (let i = 1; i < strings.length; ++i) {
      if (strings[i - 1][ret] !== strings[i][ret]) {
        break outer
      }
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function commonPrefix(strings: Array<string>) {
  return strings[0].substr(0, commonPrefixLen(strings))
}

////////////////////////////////////////////////////////////////////////////////
export function commonPrefix2(a: string, b: string) {
  return a.substr(0, commonPrefixLen2(a, b))
}

////////////////////////////////////////////////////////////////////////////////
export function commonPrefixDestructive(strings: Array<string>) {
  if (strings.length === 0) {
    return ''
  }
  if (strings.length === 1) {
    return strings[0]
  }

  strings.sort()

  return commonPrefix2(strings[0], last(strings))
}

////////////////////////////////////////////////////////////////////////////////
export function uniformSubarray<T>(array: Array<T>, ratio: number) {
  let ret = new Array<T>()
  for (let i = 0; i < array.length; ++i) {
    if (Math.floor(i * ratio) >= ret.length) {
      ret.push(array[i])
    }
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function uniformSubarray2<T>(array: Array<T>, n: number) {
  return uniformSubarray(array, n / array.length)
}

////////////////////////////////////////////////////////////////////////////////
export function deleteIndexes<T>(array: Array<T>, indexes: Array<number>) {
  indexes.sort(compareAscending)
  let ii = 0
  return array.filter((x, i) => {
    if (i === indexes[ii]) {
      ++ii
      return false
    }
    return true
  })
}

////////////////////////////////////////////////////////////////////////////////
export function transformUntilNoChange<T>(value: T, f: (value: T) => T) {
  while ((value = f(value)) !== value) { }
  return value
}

////////////////////////////////////////////////////////////////////////////////
export function rfind<T>(array: Array<T>, predicate: Predicate<T>) {
  for (let i = array.length - 1; i >= 0; --i) {
    if (predicate(array[i])) {
      return array[i]
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function clusterize<T>(
  values: Iterable<T>,
  clusterizer: (t: T) => number | boolean,
  clusters = new Array<Array<T>>(),
) {
  for (let value of values) {
    let clusterId = Number(clusterizer(value))
    if (!(clusterId in clusters)) {
      clusters[clusterId] = new Array<T>()
    }
    clusters[clusterId].push(value)
  }

  return clusters
}
