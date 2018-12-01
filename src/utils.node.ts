import { mu } from './mu'

import { readFileSync } from 'fs'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'util'
import { createInterface } from 'readline'
import { sync as mkdirpSync } from 'mkdirp'
import { promisify } from 'util'
import { BufferedBackpressWriter } from './backpressing_writer'
import { StreamPauser } from './stream_pauser'

const lineIterator = require('n-readlines')
const readFile = promisify(fs.readFile)



////////////////////////////////////////////////////////////////////////////////
export async function* liness(readable: NodeJS.ReadableStream & { [Symbol.asyncIterator] }) {
  let leftover = ''
  for await (let chunk of readable) {
    leftover += chunk
    let yld = leftover.split('\n')
    leftover = yld.pop()
    yield yld
  }
  if (leftover) {
    yield [leftover]
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function* lines(readable: NodeJS.ReadableStream & { [Symbol.asyncIterator] }) {
  let buf = ''
  for await (let chunk of readable) {
    buf += chunk
    let begin = 0
    let end: number
    while ((end = buf.indexOf('\n', begin)) >= 0) {
      yield buf.slice(begin, end)
      begin = end + 1
    }
    buf = buf.slice(begin)
  }
  if (buf) {
    yield buf
  }
}

////////////////////////////////////////////////////////////////////////////////
// non-emply, trimmed, no-spill, pipeable
export function superLinesStd(listener: (line: string) => Promise<any>) {
  return linesNoSpillStdPipeable(line => {
    line = line.trim()
    if (line) {
      return listener(line)
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
export function linesNoSpillStdPipeable(listener: (line: string) => Promise<any>) {
  exitOnStdoutPipeError()
  return linesNoSpill(process.stdin, listener)
}

////////////////////////////////////////////////////////////////////////////////
// mimics syncronous iteration
export function linesNoSpill(
  source: NodeJS.ReadableStream,
  listener: (line: string) => Promise<any>,
) {
  return new Promise<void>((resolve, reject) => {
    let buf = new Array<string>()
    let inProgress = false
    let rl = createInterface({ input: source })
      .on('line', async line => {
        buf.push(line)
        if (!inProgress) {
          rl.pause()
          inProgress = true

          for (var i = 0; i < buf.length; ++i) {
            await listener(buf[i])
          }
          buf = []

          inProgress = false
          rl.resume()
        }
      })
      .on('close', async () => {
        for (let l of buf) {
          await listener(l)
        }
        resolve()
      })
  })
}

////////////////////////////////////////////////////////////////////////////////
export function linesBackpressed(
  source: NodeJS.ReadableStream,
  dest: NodeJS.WritableStream,
  pauser: StreamPauser,
  listener: (line: string, writer: BufferedBackpressWriter) => any,
) {
  return new Promise<void>((resolve, reject) => {
    let writer = new BufferedBackpressWriter(dest, pauser)
    createInterface(source)
      .on('line', line => listener(line, writer))
      .on('close', (e) => {
        writer.flush()
        resolve()
      })
    // .on('SIGCONT', () => console.error('SIGCONT'))
    // .on('SIGINT', () => console.error('SIGINT'))
    // .on('SIGTSTP', () => console.error('SIGTSTP'))
  })
}

////////////////////////////////////////////////////////////////////////////////
export function linesBackpressedStdPipeable(
  listener: (line: string, writer: BufferedBackpressWriter) => void,
) {
  exitOnStdoutPipeError()
  return linesBackpressedStd(new StreamPauser(process.stdin), listener)
}

////////////////////////////////////////////////////////////////////////////////
export function linesBackpressedStd(
  pauser: StreamPauser,
  listener: (line: string, writer: BufferedBackpressWriter) => void,
) {
  return linesBackpressed(process.stdin, process.stdout, pauser, listener)
}

////////////////////////////////////////////////////////////////////////////////
export function forEachLine(stream: NodeJS.ReadableStream, f: (line: string) => void) {
  return new Promise<void>((resolve, reject) => {
    createInterface(stream)
      .on('line', f)
      .on('close', resolve)
      .on('error', reject)
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
  for (let line of readFileSync(filename, 'utf8').split(/\r?\n/)) {
    yield line
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* trimmedNonemptyLinesSync(filename: string) {  // todo: do not buffer file
  for (let line of linesSync(filename)) {
    line = line.trim()
    if (line) {
      yield line
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function readTsvMapSync(filePath: string, to?: Map<string, string>) {
  let ret = to || new Map<string, string>()
  for (let line of linesSync(filePath)) {
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
export function exitOnStdoutPipeError(code = 0) {
  process.stdout.on('error', err => {
    if (err.code === 'EPIPE') {
      // console.error(`exitOnStdoutPipeError at process ${process.pid}`, err)
      process.exit(code)
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
export function createWriteStreamMkdirpSync(filePath: string) {
  mkdirpSync(path.dirname(filePath))
  return fs.createWriteStream(filePath)
}

////////////////////////////////////////////////////////////////////////////////
export async function parseJsonFile(filePath: string) {
  let fileStr = await readFile(filePath, 'utf8')
  let ret = JSON.parse(fileStr)
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function parseJsonFileSync(filePath: string) {
  let fileStr = fs.readFileSync(filePath, 'utf8')
  let ret = JSON.parse(fileStr)
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function writeTojsonFile(filePath: string, obj: any) {
  let json = JSON.stringify(obj)
  fs.writeFileSync(filePath, json)
}

////////////////////////////////////////////////////////////////////////////////
export function writeTojson(writer: { write(what) }, obj: any) {
  let json = JSON.stringify(obj)
  return writer.write(json)
}

////////////////////////////////////////////////////////////////////////////////
export function writeTojsonColored(writer: { write(what) }, obj: any) {
  let objDump = util.inspect(obj, {
    colors: true,
  })
  return writer.write(objDump)
}

////////////////////////////////////////////////////////////////////////////////
export async function writeJoin(
  what: Iterable<string>,
  where: { write(what: string): any },
  joiner: string,
) {
  for (let item of what) {
    where.write(item)
    where.write(joiner)
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function writeLines(
  what: Iterable<string>,
  where: { write(what: string): any },
  joiner = '\n',
) {
  return writeJoin(what, where, '\n')
}

////////////////////////////////////////////////////////////////////////////////
export function joinToFileSync(
  //todo
  filePath: string,
  strings: Iterable<string>,
  joiner = '\n',
  trail = true
) {
  fs.writeFileSync(filePath, mu(strings).join(joiner, trail))
}

////////////////////////////////////////////////////////////////////////////////
export function logErrAndExit(e) {
  console.error(`logErrAndExit at process ${process.pid}`, process.argv, e)
  process.exit(1)
}
