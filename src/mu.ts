// todo: really, thiss?

export function mu<T>(iterable: Iterable<T> = []) {
  return new Mu(iterable)
}

export type Predicate<T> = (x: T) => boolean

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
        yield [i++, x]
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

  flatten(shallow = false) {
    const thiss = this
    return mu((function* () {
      for (let x of thiss) {
        if (typeof x !== 'string' && isIterable(x)) {
          yield* (shallow ? x : mu(x as any).flatten())
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

  empty() {  // todo
    for (let x of this) {
      return false
    }
    return true
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

  length() {
    let ret = 0
    while (!this.next().done) {
      ++ret
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
