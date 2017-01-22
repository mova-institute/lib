// todo: really, thiss?

export function mu<T>(iterable: Iterable<T> = []) {
  return new Mu(iterable)
}

export type Predicate<T> = (x: T) => any

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

  constructor(iterable: Iterable<T>) {
    this.iterator = iterable[Symbol.iterator]()
  }

  next() {
    return this.iterator.next()
  }

  chain<TT>(...iterables: (Iterable<TT> | TT)[]) {    // todo: append to this and return this
    return Mu.chain<TT>(this as any, ...iterables)    // todo
  }

  enumerate() {
    let i = 0
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        yield [i++, x] as [number, T]
      }
    })())
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

  window(n: number) {
    let buf = [...this.take(n - 1)]
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        buf.push(x)
        yield [...buf]
        buf.shift()
      }
      while (buf.length) {
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

  forEach(fn: (x: T) => any) {
    for (let x of this) {
      fn(x)
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
    if (n < 0) {
      return
    }
    for (let x of this) {
      if (!n--) {
        return x
      }
    }
  }

  first() {
    return this.nth(0)
  }

  length() {
    let ret = 0
    while (!this.next().done) {
      ++ret
    }
    return ret
  }

  join(joiner = '') {
    let ret = ''
    for (let x of this) {
      if (ret) {
        ret += joiner
      }
      ret += x
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
