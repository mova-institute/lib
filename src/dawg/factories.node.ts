import {Dictionary} from './dictionary';
import {Guide} from './guide';
import {Dawg, CompletionDawg, BytesDawg, ObjectDawg} from './dawg';

import {buffer2typedArray} from '../utils.node';
import {readNBytesSync} from '../utils.node';

import {openSync} from 'fs';


////////////////////////////////////////////////////////////////////////////////
export function createDictionarySync(fd: number) {
  let size = readNBytesSync(4, fd).readUInt32LE(0) * 4;
  let data = readNBytesSync(size, fd);
  
  return new Dictionary(buffer2typedArray(data, Uint32Array));
}

////////////////////////////////////////////////////////////////////////////////
export function createDawgSync(filename: string) {
  let fd = openSync(filename, 'r');
  
  return new Dawg(createDictionarySync(fd));
}

////////////////////////////////////////////////////////////////////////////////
function createGuideSync(fd: number) {
  let size = readNBytesSync(4, fd).readUInt32LE(0) * 4 * 2;
  let data = readNBytesSync(size, fd);
  
  return new Guide(buffer2typedArray(data, Uint8Array));
}

////////////////////////////////////////////////////////////////////////////////
export function createCompletionDawgSync(filename: string) {
  let fd = openSync(filename, 'r');
  
  return new CompletionDawg(createDictionarySync(fd), createGuideSync(fd));
}

////////////////////////////////////////////////////////////////////////////////
export function createObjectDawgSync<T>(filename: string, deserializer: (buf: ArrayBuffer) => T) {
  let fd = openSync(filename, 'r');
  
  return new ObjectDawg<T>(createDictionarySync(fd), createGuideSync(fd), 0b1, deserializer);
}
