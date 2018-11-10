//////////////////////////////////////////////////////////////////////////////////
export class CoolMap<K, V> extends Map<K, V> {
  addAll(iterable: Iterable<[K, V]>) {
    for (let [k, v] of iterable) {
      this.set(k, v)
    }
  }
}
