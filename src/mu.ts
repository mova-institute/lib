// todo: really, thiss?

export function mu<T>(iterable: Iterable<T> = []) {
  return new Mu(iterable)
}

export type Predicate<T> = (x: T) => any
export type PredicateWithIndex<T> = (x: T, i: number) => any

function isIterable(thing) {
  return typeof thing[Symbol.iterator] === 'function'
}

export class Mu<T> implements Iterable<T> {
  iterator: Iterator<T>

  static chain<T>(...iterables: (Iterable<T> | T)[]) {
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

  static zip<T>(...iterables: (Iterable<T> | T)[]): Mu<Array<T>> {
    throw new Error(`Not implemented`)
  }

  constructor(iterable: Iterable<T>) {
    this.iterator = iterable[Symbol.iterator]()
  }

  next() {
    return this.iterator.next()
  }

  chain<TT>(...iterables: (Iterable<TT> | TT)[]) {    // todo: append to this and return this
    return Mu.chain<TT>(this as any, ...iterables)    // todo
  }

  chunk(n: number) {
    let buf: T[] = []
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
    let buf: T[] = []
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
    let buf: T[] = []
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        if (fn(x)) {
          yield buf
          buf = []
        } else {
          buf.push(x)
        }
      }
      if (buf.length) {
        yield buf
      }
    })())
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
  }

  filter(fn: Predicate<T>) {
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

  transform<MappedT>(fn: (x: T, i: number) => void) {
    const thiss = this
    let i = 0
    return mu((function* () {
      for (let x of thiss) {
        fn(x, i++)
        yield x
      }
    })())
  }

  pluck<MappedT>(prop: string) {
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

  count(fn: Predicate<T>) {
    let ret = 0
    for (let x of this) {
      if (fn(x)) {
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

  length() {
    let ret = 0
    while (!this.next().done) {
      ++ret
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
