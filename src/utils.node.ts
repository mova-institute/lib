import { LibxmlDocument, LibxmlElement } from 'unixml-libxmljs';
import { readFileSync, readSync, Stats, statSync } from 'fs';
import { readTillEnd } from './stream_utils.node';

////////////////////////////////////////////////////////////////////////////////
export async function stream2lxmlRoot(stream) {
  return string2lxmlRoot(await readTillEnd(stream));
}

////////////////////////////////////////////////////////////////////////////////
export function string2lxmlRoot(xmlstr: string) {  // todo: kill
  return LibxmlDocument.parse(xmlstr).root;
}

////////////////////////////////////////////////////////////////////////////////
export function filename2lxmlRootSync(filename: string) {
  let xmlstr = readFileSync(filename, 'utf8');
  return string2lxmlRoot(xmlstr);
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
