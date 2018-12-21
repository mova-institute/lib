/* tslint:disable:no-this-assignment */

export function amu<T>(iterable: AsyncIterable<T>) {
  return new AMu(iterable)
}

// export function ramu<T>(array: Array<T>) {
//   return new AMu((function* () {
//     for await (let i = array.length - 1; i >= 0; --i) {
//       yield array[i]
//     }
//   })())
// }

export type Predicate<T> = (x: T) => any
export type PredicateWithIndex<T> = (x: T, i: number) => any

function isIterable(thing) {
  return typeof thing[Symbol.asyncIterator] === 'function'
}

export class AMu<T> implements AsyncIterable<T> {
  iterator: AsyncIterator<T>

  static chain<T>(...iterables: Array<AsyncIterable<T> | T>) {
    return amu((async function* () {
      for await (let it of iterables) {
        if (isIterable(it)) {
          yield* (it as AsyncIterable<T>)
        } else {
          yield it as T
        }
      }
    })())
  }

  static zip<T>(...iterables: Array<AsyncIterable<T> | T>): AMu<Array<T>> {
    return amu((async function* () {
      let iterators = iterables.map(x => x[Symbol.asyncIterator]())

      let toyield: Array<T> = []
      while (true) {
        for await (let it of iterators) {
          let { done, value } = it.next()
          if (done) {
            return
          }
          toyield.push(value)
        }
        yield toyield
        toyield = []
      }
    })())
  }

  static seq(start = 0, step = 1) {
    return amu((async function* () {
      while (true) {
        yield start
        start += step
      }
    })())
  }

  constructor(iterable: AsyncIterable<T>) {
    this.iterator = iterable[Symbol.asyncIterator]()
  }

  next() {
    return this.iterator.next()
  }

  chunk(n: number) {
    let buf = new Array<T>()
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        if (buf.length >= n) {
          yield buf
          buf = []
        }
        buf.push(x)
      }
      if (buf.length) {
        yield buf
      }
    })())
  }

  chunkByMax(n: number, lengther: (x: T) => number) {
    let buf = new Array<T>()
    let curLength = 0
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        let xLength = lengther(x)
        if (curLength + xLength > n && buf.length) {
          yield buf
          buf = []
          curLength = 0
        }
        buf.push(x)
        curLength += xLength
      }
      if (buf.length) {
        yield buf
      }
    })())
  }

  split(fn: Predicate<T>) {
    let buf = new Array<T>()
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        if (fn(x)) {
          yield [buf, x] as [Array<T>, T]
          buf = []
        } else {
          buf.push(x)
        }
      }
      if (buf.length) {
        yield [buf, undefined] as [Array<T>, T]
      }
    })())
  }

  split0(fn: Predicate<T>) {
    return this.split(fn).map(x => x[0])
  }

  async window(n: number, focus = 0) {
    // assures focus-ith element is defined
    // [undefined, focus, next]
    // [prev, focus, next]
    // [prev, focus, undefined]

    let buf = new Array<T>(focus)
    let topush = await this.take(n - 1 - focus).toArray()
    buf.push(...topush)  // todo
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        buf.push(x)
        yield [...buf]
        buf.shift()
      }
      while (buf.length > focus) {
        yield [...buf]
        buf.shift()
      }
    })())
  }

  take(n: number) {
    const thiss = this
    return amu((async function* () {
      if (n < 1) {
        return
      }
      let i = 0
      for await (let x of thiss) {
        yield x
        if (++i >= n) {
          break
        }
      }
    })())
  }

  takeWhile(fn: Predicate<T>) {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        if (!fn(x)) {
          return
        }
        yield x
      }
    })())
  }

  takeWhileIncluding(fn: Predicate<T>) {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        yield x
        if (!fn(x)) {
          return
        }
      }
    })())
  }

  entries() {
    const thiss = this
    let i = 0
    return amu((async function* () {
      for await (let x of thiss) {
        yield [i++, x] as [number, T]
      }
    })())
  }

  async forEach(fn: (x: T, i: number) => any) {
    let i = 0
    for await (let x of this) {
      fn(x, i++)
    }
    return this
  }

  filter(fn: Predicate<T>) {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        if (fn(x)) {
          yield x
        }
      }
    })())
  }

  findAllIndexes(fn: PredicateWithIndex<T>) {
    const thiss = this
    let i = 0
    return amu((async function* () {
      for await (let x of thiss) {
        if (fn(x, i)) {
          yield i
        }
        ++i
      }
    })())
  }

  unique() {
    const thiss = this
    const seen = new Set()
    return amu((async function* () {
      for await (let x of thiss) {
        if (!seen.has(x)) {
          yield x
          seen.add(x)
        }
      }
      seen.clear()
    })())
  }

  flattenShallowNaive() {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        yield* x as any
      }
    })())
  }

  flatten(shallow = false): AMu<any> {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        if (typeof x !== 'string' && isIterable(x)) {
          if (shallow) {
            yield* (x as any)
          } else {
            yield* amu(x as any).flatten()
          }
        } else {
          yield x
        }
      }
    })())
  }

  map<MappedT>(fn: (x: T) => MappedT) {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        yield fn(x)
      }
    })())
  }

  mapAwait<MappedT>(fn: (x: T) => Promise<MappedT>) {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        yield await fn(x) as MappedT
      }
    })())
  }

  transform(fn: (x: T, i: number) => void) {
    const thiss = this
    let i = 0
    return amu((async function* () {
      for await (let x of thiss) {
        fn(x, i++)
        yield x
      }
    })())
  }

  pluck(prop: string | number) {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        yield x[prop]
      }
    })())
  }

  /*
    map() {
      const thiss = this
      return mu((function* () {
      })())
    }
  */
  async find(fn: Predicate<T>) {
    for await (let x of this) {
      if (fn(x)) {
        return x
      }
    }
  }

  async some(fn: Predicate<T>) {
    for await (let x of this) {
      if (fn(x)) {
        return true
      }
    }
    return false
  }

  has(thing: T) {
    return this.some(x => x === thing)
  }

  async every(fn: Predicate<T>) {
    for await (let x of this) {
      if (!fn(x)) {
        return false
      }
    }
    return true
  }

  async longerThan(n: number) {
    for await (let _ of this) {
      if (--n < 0) {
        return true
      }
    }
    return false
  }

  async count(fn?: Predicate<T>) {
    let ret = 0
    for await (let x of this) {
      if (!fn || fn(x)) {
        ++ret
      }
    }
    return ret
  }

  async nth(n: number) {
    for await (let x of this) {
      if (--n < 0) {
        return x
      }
    }
  }

  drop(n = 1) {
    const thiss = this
    return amu((async function* () {
      for await (let x of thiss) {
        if (--n >= 0) {
          continue
        }
        yield x
      }
    })())
  }

  first() {
    return this.nth(0)
  }

  async last() {
    let ret: T
    for await (let x of this) {
      ret = x
    }
    return ret
  }

  async join(joiner = '', trailing = false) {
    let ret = ''
    for await (let x of this) {
      if (ret) {
        ret += joiner
      }
      ret += x
    }
    if (trailing) {
      ret += joiner
    }

    return ret
  }

  async toArray() {
    let ret = new Array<T>()
    for await (let x of this) {
      ret.push(x)
    }

    return ret
  }

  [Symbol.asyncIterator]() {
    return this
  }
}
