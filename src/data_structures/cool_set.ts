export class CoolSet<T> extends Set<T> {
  addAll(iterable: Iterable<T>) {
    for (let val of iterable) {
      this.add(val)
    }
  }

  async addAllAsync(iterable: AsyncIterableIterator<T>) {
    for await (let val of iterable) {
      this.add(val)
    }
  }

  addNew(value: T) {
    if (this.has(value)) {
      return false
    }
    this.add(value)

    return true
  }
}
