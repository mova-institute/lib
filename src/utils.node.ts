import { readFileSync } from 'fs'
import { Readable } from 'stream'
import { createInterface } from 'readline'

const lineIterator = require('n-readlines')



////////////////////////////////////////////////////////////////////////////////
export function forEachLine(stream: Readable, f: (line: string) => void) {
  return new Promise((resolve, reject) => {
    createInterface({ input: stream })
      .on('line', f)
      .on('close', () => resolve())
  })
}

////////////////////////////////////////////////////////////////////////////////
export function* linesStreamSync(filename: string) {
  let it = new lineIterator(filename)
  let bytes: Buffer
  while (bytes = it.next()) {
    yield bytes.toString('utf8')
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* linesSync(filename: string) {  // todo: do not buffer file
  for (let line of readFileSync(filename, 'utf8').split('\n')) {
    yield line
  }
}

////////////////////////////////////////////////////////////////////////////////
export function linesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n')
}
