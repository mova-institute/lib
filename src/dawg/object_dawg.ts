import { BytesDawg } from './bytes_dawg';
import { Dictionary } from './dictionary';
import { Guide } from './guide';
import { encodeUtf8 } from './codec';



export class ObjectDawg<T> extends BytesDawg {
  constructor(dic: Dictionary,
              guide: Guide,
              private deserializer: (bytes: ArrayBuffer) => T,
              payloadSeparator: number,
              binasciiWorkaround = false) {
    super(dic, guide, payloadSeparator, binasciiWorkaround);
  }

  get(key: string) {
    let ret = new Array<T>();

    for (let payload of super.payloadBytes(encodeUtf8(key))) {
      ret.push(this.deserializer(payload));
    }

    return ret;
  }
}
