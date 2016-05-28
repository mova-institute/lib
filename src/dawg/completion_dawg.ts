import { Dawg } from './dawg';
import { ByteCompletionDawg } from './byte_completion_dawg';



export class CompletionDawg<K> extends Dawg<K> {
  constructor(
      protected dawg: ByteCompletionDawg,
      keyEncoder: (key: K) => Iterable<number>,
      protected keyDecoder: (bytes: Array<number>) => K) {

    super(dawg, keyEncoder);
  }

  hasWithPrefix(prefix: K) {
    return this.dawg.hasBytesWithPrefix(this.keyEncoder(prefix));
  }

  *completions(prefix: K) {
    for (let completion of this.dawg.completionsBytes(this.keyEncoder(prefix))) {
      yield this.keyDecoder(completion);
    }
  }
}
