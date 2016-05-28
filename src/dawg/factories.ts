import { Dictionary } from './dictionary';
import { Guide } from './guide';
import { ByteMapDawg } from './byte_map_dawg';
import { ByteCompletionDawg } from './byte_completion_dawg';
import { MapDawg, ValueDeserializer } from './map_dawg';
import { encodeUtf8 } from './codec';



export function createStringMapDawg<T>(
  buf: ArrayBuffer,
  deserializer: ValueDeserializer<T>,
  payloadSeparator = 1,
  binasciiWorkaround = false) {

  let view = new DataView(buf);
  let dicSize = view.getUint32(0, true);
  let dicData = new Uint32Array(buf, 4, dicSize);
  let offset = 4 + dicSize * 4;
  let guideSize = view.getUint32(offset, true) * 2;
  let guideData = new Uint8Array(buf, offset + 4, guideSize);

  let byteMapDawg = new ByteMapDawg(
    new ByteCompletionDawg(new Dictionary(dicData), new Guide(guideData)),
    payloadSeparator,
    binasciiWorkaround);

  return new MapDawg<string, T>(byteMapDawg, encodeUtf8, deserializer);
}
