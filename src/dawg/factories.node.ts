import { Dictionary } from './dictionary';
import { Guide } from './guide';
import { ByteDawg } from './byte_dawg';
import { ByteMapDawg } from './byte_map_dawg';
import { ByteCompletionDawg } from './byte_completion_dawg';
import { MapDawg, ValueDeserializer } from './map_dawg';
import { encodeUtf8 } from './codec';

import { buffer2typedArray } from '../utils.node';
import { readNBytesSync } from '../utils.node';

import { openSync } from 'fs';


////////////////////////////////////////////////////////////////////////////////
export function createDictionarySync(fd: number) {
  let size = readNBytesSync(4, fd).readUInt32LE(0) * 4;
  let data = readNBytesSync(size, fd);

  return new Dictionary(buffer2typedArray(data, Uint32Array));
}

////////////////////////////////////////////////////////////////////////////////
export function createByteDawgSync(filename: string) {
  let fd = openSync(filename, 'r');

  return new ByteDawg(createDictionarySync(fd));
}

////////////////////////////////////////////////////////////////////////////////
function createGuideSync(fd: number) {
  let size = readNBytesSync(4, fd).readUInt32LE(0) * 4 * 2;
  let data = readNBytesSync(size, fd);

  return new Guide(buffer2typedArray(data, Uint8Array));
}

////////////////////////////////////////////////////////////////////////////////
export function createByteCompletionDawgSync(filename: string) {
  let fd = openSync(filename, 'r');

  return new ByteCompletionDawg(createDictionarySync(fd), createGuideSync(fd));
}

////////////////////////////////////////////////////////////////////////////////
export function createStringMapDawgSync<T>(
  filename: string,
  deserializer: ValueDeserializer<T>) {

  let byteMapDawg = new ByteMapDawg(createByteCompletionDawgSync(filename), 0b1, true);

  return new MapDawg<string, T>(byteMapDawg, encodeUtf8, deserializer);
}
