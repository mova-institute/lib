import { ByteCompletionDawg } from './byte_completion_dawg';
import { b64decodeFromArray } from './codec';



export class ByteMapDawg {
  constructor(protected dawg: ByteCompletionDawg,
              protected payloadSeparator = 1,
              protected binasciiWorkaround = false) {  // see https://github.com/kmike/DAWG/issues/21
  }

  hasBytes(key: Iterable<number>): boolean {
    return this.dawg.hasBytesWithPrefix([...key, this.payloadSeparator]);
  }

  *getBytes(key: Iterable<number>) {
    for (let completed of this.dawg.completionsBytes([...key, this.payloadSeparator])) {
      if (this.binasciiWorkaround) {
        completed = completed.slice(0, -1);
      }
      yield b64decodeFromArray(completed);
    }
  }
}
