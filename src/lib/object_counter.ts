export class ObjectCounter<T> {
  private map = new Map<T, number>()

  account(val: T) {
    let current = this.map.get(val)
    if (current === undefined) {
      this.map.set(val, 1)
    } else {
      this.map.set(val, current + 1)
    }
  }

  get(val: T) {
    return this.map.get(val)
  }

  getStats() {
    return [...this.map.entries()].sort((a, b) => b[1] - a[1])
  }

  keys() {
    return this.map.keys()
  }
}
