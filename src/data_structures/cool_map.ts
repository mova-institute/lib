export class CoolMap<K, V> extends Map<K, V> {
  addAll(iterable: Iterable<[K, V]>) {
    for (let [k, v] of iterable) {
      this.set(k, v)
    }
  }

  // setNew(key: K, value: V) {
  //   this.set(key, value)
  // }
}

export class CoolMapInt<K> extends CoolMap<K, number> {
  inc(key: K) {
    if (super.has(key)) {
      let newValue = super.get(key) + 1
      super.set(key, newValue)
      return newValue
    }
    super.set(key, 1)
    return 1
  }
}
