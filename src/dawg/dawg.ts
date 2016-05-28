import { Dictionary } from './dictionary';
import { encodeUtf8 } from './codec';



export class Dawg {
  constructor(protected dictionary: Dictionary) { }

  has(key: string): boolean {
    return this.dictionary.has(encodeUtf8(key));
  }
}
