import {LibxmlDocument, LibxmlElement} from './xml/api/libxmljs_implementation';
import {readFileSync, readSync, Stats, statSync} from 'fs';
import {parseXmlString} from 'libxmljs';
import {readTillEnd} from './stream_utils.node';

////////////////////////////////////////////////////////////////////////////////
export async function stream2lxmlRoot(stream) {
  return string2lxmlRoot(await readTillEnd(stream));
}

////////////////////////////////////////////////////////////////////////////////
export function string2lxmlRoot(xmlstr: string) {
  let lxmlXml = parseXmlString(xmlstr);
  return new LibxmlDocument(lxmlXml).documentElement;
}

////////////////////////////////////////////////////////////////////////////////
export function filename2lxmlRootSync(filename: string) {
  let xmlstr = readFileSync(filename, 'utf8');
  let lxmlXml = parseXmlString(xmlstr);

  return new LibxmlDocument(lxmlXml).documentElement;
}

////////////////////////////////////////////////////////////////////////////////
export function readNBytesSync(n: number, fd: number) {
  let buf = new Buffer(n);
  readSync(fd, buf, 0, n, null);

  return buf;
}

////////////////////////////////////////////////////////////////////////////////
export function tryStatSync(path: string): Stats {
  try {
    return statSync(path);
  }
  catch (e) {
    return null;
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* linesSync(filename: string) {  // todo: do not buffer file
  for (let line of readFileSync(filename, 'utf8').split('\n')) {
    yield line;
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* nonemptyLinesSync(filename: string) {
  for (let line of linesSync(filename)) {
    line = line.trim();
    if (line) {
      yield line;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function linesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n');
}

////////////////////////////////////////////////////////////////////////////////
export function nonemptyLinesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n').map(x => x.trim()).filter(x => !!x);
}

////////////////////////////////////////////////////////////////////////////////
function buffer2arrayBuffer(val: Buffer, start = 0, length = val.length) {  // todo: copy 64?
  let ret = new ArrayBuffer(length);
  let view = new Uint8Array(ret);
  for (let i = 0; i < length; ++i) {
    view[i] = val[start + i];
  }
  
  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function buffer2typedArray(buffer: Buffer, arrayType, startByte = 0, byteLength = buffer.length) {
  return new arrayType(buffer2arrayBuffer(buffer, startByte, byteLength));
}
