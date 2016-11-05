import { readFileSync } from 'fs'
import { createInterface } from 'readline'

const lineIterator = require('n-readlines')



////////////////////////////////////////////////////////////////////////////////
export function forEachLine(stream: NodeJS.ReadableStream, f: (line: string) => void) {
  return new Promise<void>((resolve, reject) => {
    createInterface({ input: stream })
      .on('line', f)
      .on('close', () => resolve())
  })
}

////////////////////////////////////////////////////////////////////////////////
export async function allLinesFromStdin() {
  let ret = new Array<string>()
  await forEachLine(process.stdin, line => ret.push(line))
  return ret
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
export function readTsvMapSync(path: string, to?: Map<string, string>) {
  let ret = to || new Map<string, string>()
  for (let line of linesSync(path)) {
    let [key, val] = line.split('\t')
    ret.set(key, val)
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function linesSyncArray(filePath: string) {
  return readFileSync(filePath, 'utf8').trim().split('\n')
}

////////////////////////////////////////////////////////////////////////////////
export function ignorePipeErrors() {
  process.stdout.on('error', err => {
    if (err.code === 'EPIPE') {
      //console.error(err.stack)
      process.exit(0)
    }
  })
}
