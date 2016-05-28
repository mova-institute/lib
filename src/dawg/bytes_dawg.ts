import { Dictionary } from './dictionary';
import { Guide } from './guide';
import { CompletionDawg } from './completion_dawg';
import { encodeUtf8, b64decodeFromArray } from './codec';



export class BytesDawg extends CompletionDawg {
  constructor(dic: Dictionary,
              guide: Guide,
              private payloadSeparator = 0b1,
              private binasciiWorkaround = false) {  // see https://github.com/kmike/DAWG/issues/21
    super(dic, guide);
  }

  has(key: string): boolean {
    return !super.completionBytes([...encodeUtf8(key), this.payloadSeparator]).next().done;
  }

  *payloadBytes(key: Array<number>) {
    for (let completed of super.completionBytes([...key, this.payloadSeparator])) {
      if (this.binasciiWorkaround) {
        completed = completed.slice(0, -1);
      }
      yield b64decodeFromArray(completed);
    }
  }
}