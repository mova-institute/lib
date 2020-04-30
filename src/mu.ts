/* tslint:disable:no-this-assignment */

export function mu<T>(iterable: Iterable<T> = []) {
  return new Mu(iterable)
}

export function rmu<T>(array: Array<T>) {
  return new Mu((function* () {
    for (let i = array.length - 1; i >= 0; --i) {
      yield array[i]
    }
  })())
}

export type Predicate<T> = (x: T) => any
export type PredicateWithIndex<T> = (x: T, i: number) => any

function isIterable(thing) {
  return typeof thing[Symbol.iterator] === 'function'
}

export class Mu<T> implements Iterable<T> {
  iterator: Iterator<T>

  static chain<T>(...iterables: Array<Iterable<T> | T>) {
    return mu((function* () {
      for (let it of iterables) {
        if (isIterable(it)) {
          yield* (it as Iterable<T>)
        } else {
          yield it as T
        }
      }
    })())
  }

  static zip<T>(...iterables: Array<Iterable<T> | T>): Mu<Array<T>> {
    return mu((function* () {
      let iterators = iterables.map(x => x[Symbol.iterator]())

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
    })())
  }

  static seq(start = 0, step = 1) {
    return mu((function* () {
      while (true) {
        yield start
        start += step
      }
    })())
  }

  constructor(iterable: Iterable<T>) {
    this.iterator = iterable[Symbol.iterator]()
  }

  next() {
    return this.iterator.next()
  }

  chunk(n: number) {
    let buf = new Array<T>()
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
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
    return mu((function* () {
      for (let x of thiss) {
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
    return mu((function* () {
      for (let x of thiss) {
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

  window(n: number, focus = 0) {
    // assures focus-ith element is defined
    // [undefined, focus, next]
    // [prev, focus, next]
    // [prev, focus, undefined]

    let buf = new Array<T>(focus)
    buf.push(...this.take(n - 1 - focus))
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
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
    return mu((function* () {
      if (n < 1) {
        return
      }
      let i = 0
      for (let x of thiss) {
        yield x
        if (++i >= n) {
          break
        }
      }
    })())
  }

  takeWhile(fn: Predicate<T>) {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        if (!fn(x)) {
          return
        }
        yield x
      }
    })())
  }

  takeWhileIncluding(fn: Predicate<T>) {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
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
    return mu((function* () {
      for (let x of thiss) {
        yield [i++, x] as [number, T]
      }
    })())
  }

  forEach(fn: (x: T, i: number) => any) {
    let i = 0
    for (let x of this) {
      fn(x, i++)
    }
    return this
  }

  filter(fn: Predicate<T> = x => x) {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        if (fn(x)) {
          yield x
        }
      }
    })())
  }

  findAllIndexes(fn: PredicateWithIndex<T>) {
    const thiss = this
    let i = 0
    return mu((function* () {
      for (let x of thiss) {
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
    return mu((function* () {
      for (let x of thiss) {
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
    return mu((function* () {
      for (let x of thiss) {
        yield* x as any
      }
    })())
  }

  flatten(shallow = false): Mu<any> {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        if (typeof x !== 'string' && isIterable(x)) {
          if (shallow) {
            yield* (x as any)
          } else {
            yield* mu(x as any).flatten()
          }
        } else {
          yield x
        }
      }
    })())
  }

  map<MappedT>(fn: (x: T) => MappedT) {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        yield fn(x)
      }
    })())
  }

  transform(fn: (x: T, i: number) => void) {
    const thiss = this
    let i = 0
    return mu((function* () {
      for (let x of thiss) {
        fn(x, i++)
        yield x
      }
    })())
  }

  pluck<MappedT>(prop: string | number) {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
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
  find(fn: Predicate<T>) {
    for (let x of this) {
      if (fn(x)) {
        return x
      }
    }
  }

  some(fn: Predicate<T>) {
    for (let x of this) {
      if (fn(x)) {
        return true
      }
    }
    return false
  }

  has(thing: T) {
    return this.some(x => x === thing)
  }

  every(fn: Predicate<T>) {
    for (let x of this) {
      if (!fn(x)) {
        return false
      }
    }
    return true
  }

  longerThan(n: number) {
    for (let _ of this) {
      if (--n < 0) {
        return true
      }
    }
    return false
  }

  count(fn?: Predicate<T>) {
    let ret = 0
    for (let x of this) {
      if (!fn || fn(x)) {
        ++ret
      }
    }
    return ret
  }

  nth(n: number) {
    for (let x of this) {
      if (--n < 0) {
        return x
      }
    }
  }

  drop(n = 1) {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
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

  last() {
    let ret: T
    for (let x of this) {
      ret = x
    }
    return ret
  }

  join(joiner = '', trailing = false) {
    let ret = ''
    for (let x of this) {
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

  toArray() {
    return [...this]
  }

  [Symbol.iterator]() {
    return this
  }
}
