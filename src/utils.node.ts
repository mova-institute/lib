import { LibxmljsDocument, LibxmljsElement } from 'xmlapi-libxmljs'
import { readFileSync, readSync, Stats, statSync } from 'fs'
import { readTillEnd } from './stream_utils.node'

////////////////////////////////////////////////////////////////////////////////
export async function stream2lxmlRoot(stream) {
  return string2lxmlRoot(await readTillEnd(stream))
}

////////////////////////////////////////////////////////////////////////////////
export function string2lxmlRoot(xmlstr: string) {  // todo: kill
  return LibxmljsDocument.parse(xmlstr).root()
}

////////////////////////////////////////////////////////////////////////////////
export function filename2lxmlRootSync(filename: string) {
  let xmlstr = readFileSync(filename, 'utf8')
  return string2lxmlRoot(xmlstr)
}

////////////////////////////////////////////////////////////////////////////////
export function* linesSync(filename: string) {  // todo: do not buffer file
  for (let line of readFileSync(filename, 'utf8').split('\n')) {
    yield line
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* nonemptyLinesSync(filename: string) {
  for (let line of linesSync(filename)) {
    line = line.trim()
    if (line) {
      yield line
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function linesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n')
}

////////////////////////////////////////////////////////////////////////////////
export function nonemptyLinesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n').map(x => x.trim()).filter(x => !!x)
}
