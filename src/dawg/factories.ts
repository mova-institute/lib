import {Dictionary} from './dictionary';
import {Guide} from './guide';
import {ObjectDawg} from './dawg';


export function createObjectDawg<T>(buf: ArrayBuffer, deserializer: (buf: ArrayBuffer) => T) {
  let view = new DataView(buf);
  let dicSize = view.getUint32(0, true);
  let dicData = new Uint32Array(buf, 4, dicSize);
  let offset = 4 + dicSize * 4;
  let guideSize = view.getUint32(offset, true) * 2;
  let guideData = new Uint8Array(buf, offset + 4, guideSize);

  return new ObjectDawg<T>(new Dictionary(dicData), new Guide(guideData), 0b1, deserializer);
}
