import { Dictionary } from './dictionary';



export class ByteDawg {
  constructor(protected dictionary: Dictionary) {
  }

  hasBytes(value: Iterable<number>) {
    return this.dictionary.has(value);
  }
}
