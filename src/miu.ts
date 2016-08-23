// todo: really, thiss?

export function miu<T>(iterable: Iterable<T>) {
  return new Miu(iterable)
}

export type Predicate<T> = (x: T) => boolean

function isIterable(thing) {
  return typeof thing[Symbol.iterator] === 'function'
}

export class Miu<T> {
  iterator: Iterator<T>

  static *chain<TT>(...iterables: (Iterable<TT> | TT)[]) {
    for (let it of iterables) {
      if (isIterable(it)) {
        yield* (it as Iterable<TT>)
      } else {
        yield it
      }
    }
  }

  constructor(iterable: Iterable<T>) {
    this.iterator = iterable[Symbol.iterator]()
  }

  next() {
    return this.iterator.next()
  }

  // chain<TT>(...iterables: (Iterable<TT> | TT)[]) {
  //   return Miu.chain(this, ...iterables)
  // }

  forEach(fn: (x: T) => any) {
    for (let x of this) {
      fn(x)
    }
  }

  filter(fn: Predicate<T>) {
    const thiss = this
    return miu((function* () {
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
    return miu((function* () {
      for (let x of thiss) {
        if (!seen.has(x)) {
          yield x
          seen.add(x)
        }
      }
      seen.clear()
    })())
  }

  map<MT>(fn: (x: T) => MT) {
    const thiss = this
    return miu((function* () {
      for (let x of thiss) {
        yield fn(x)
      }
    })())
  }

  /*
    map() {
      const thiss = this
      return miu((function* () {
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

  toArray() {
    return [...this]
  }

  [Symbol.iterator]() {
    return this
  }
}
