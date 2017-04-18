import { readFileSync } from 'fs'
import * as fs from 'fs'
import * as path from 'path'
import { createInterface } from 'readline'
import { sync as mkdirpSync } from 'mkdirp'

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

////////////////////////////////////////////////////////////////////////////////
export function writeFileSyncMkdirp(filePath: string, value: string) {
  mkdirpSync(path.dirname(filePath))
  fs.writeFileSync(filePath, value)
  return filePath
}

////////////////////////////////////////////////////////////////////////////////
export function openSyncMkdirp(filePath: string, flags: string) {
  mkdirpSync(path.dirname(filePath))
  return fs.openSync(filePath, flags)
}

////////////////////////////////////////////////////////////////////////////////
export function parseJsonFromFile(filePath: string) {
  let fileStr = fs.readFileSync(filePath, 'utf8')
  let ret = JSON.parse(fileStr)
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function write2jsonFile(filePath: string, obj: any) {
  let json = JSON.stringify(obj)
  fs.writeFileSync(filePath, json)
}
