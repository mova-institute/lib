import { ByteDawg } from './byte_dawg';



export class Dawg<K> {
  constructor(
      protected dawg: ByteDawg,
      protected keyEncoder: (key: K) => Iterable<number>) {
  }

  has(value: K): boolean {
    return this.dawg.hasBytes(this.keyEncoder(value));
  }
}
