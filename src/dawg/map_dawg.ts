import {ByteMapDawg} from './byte_map_dawg';




export interface ValueDeserializer<V> {
  (bytes: Uint8Array): V;
}

export class MapDawg<K, V> {
  constructor(
    protected dawg: ByteMapDawg,
    protected keyEncoder: (key: K) => Iterable<number>,
    protected valueDeserializer: ValueDeserializer<V>) {
  }

  has(key: K) {
    return this.dawg.hasBytes(this.keyEncoder(key));
  }

  *get(key: K) {
    for (let value of this.dawg.getBytes(this.keyEncoder(key))) {
      yield this.valueDeserializer(value);
    }
  }
}
