export class DefaultedMap<K, V> extends Map<K, V> {
  constructor(private defaultValueFactory: () => V, entries?: [K, V][]) {
    super(entries)
  }
  get(key: K) {
    if (this.has(key)) {
      return super.get(key)
    }

    let ret = this.defaultValueFactory()
    this.set(key, ret)
    return ret
  }
}
