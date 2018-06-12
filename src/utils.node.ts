import { writePromiseDrain } from './stream.node'
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
// todo: rerwrite with async iterators once avail
export function lineBulksAsync(
  readable: NodeJS.ReadableStream,
  pauser: StreamPauser,
  callback: (lineBulk: Array<string>) => void,
  newline: string | RegExp = '\n',
) {
  pauser = pauser || new StreamPauser(readable)

  let pauseId = {}
  return new Promise<void>((resolve, reject) => {
    let leftover = ''

    const onData = async (chunk: string) => {
      leftover += chunk
      let splitted = leftover.split(newline)
      if (splitted.length > 1) {
        leftover = splitted.pop()
        pauser.pause(pauseId)
        try {
          await callback(splitted)
        } catch (e) {
          readable  // todo: investigate if this is necessary
            .removeListener('error', reject)
            .removeListener('data', onData)
            .removeListener('end', onEnd)
          reject(e)
        } finally {
          pauser.resume(pauseId)
        }
      }
    }

    const onEnd = async () => {
      await callback([leftover])
      resolve()
    }

    readable
      .on('error', reject)
      .on('data', onData)
      .on('end', onEnd)
  })
}

////////////////////////////////////////////////////////////////////////////////
// todo: rerwrite with async iterators once avail
export function linesAsync(
  readable: NodeJS.ReadableStream,
  pauser: StreamPauser,
  callback: (line: string) => void,
  newline: string | RegExp = '\n',
) {
  return lineBulksAsync(readable, pauser, async lineBulk => {
    for (let line of lineBulk) {
      await callback(line)
    }
  }, newline)
}

////////////////////////////////////////////////////////////////////////////////
export function linesAsyncStd(
  callback: (line: string) => void,
  newline: string | RegExp = '\n',
) {
  return linesAsync(process.stdin, new StreamPauser(process.stdin), callback, newline)
}
////////////////////////////////////////////////////////////////////////////////
// todo: rerwrite with async iterators once avail
export function chunksAsync(
  readable: NodeJS.ReadableStream,
  callback: (chunkBulk: Array<Buffer>) => void,
  splitter: Buffer,
) {
  if (splitter.length !== 1) {
    throw new Error(`Only 1-byte splitters are currently supported`)
  }

  return new Promise<void>((resolve, reject) => {
    let leftover = Buffer.allocUnsafe(0)

    const consumer = async (chunk: Buffer) => {
      let ret = new Array<Buffer>()
      let start = 0
      let end = -1
      while ((end = chunk.indexOf(splitter, start)) >= 0) {
        if (leftover.length) {
          ret.push(Buffer.concat([leftover, chunk], leftover.length + end))
          // await callback(Buffer.concat([leftover, chunk], leftover.length + end))
          leftover = Buffer.allocUnsafe(0)
        } else {
          ret.push(chunk.slice(start, end))
          // await callback(chunk.slice(start, end))
        }
        start = end + splitter.length
      }

      if (start < chunk.length) {
        leftover = Buffer.allocUnsafe(chunk.length - start)
        chunk.copy(leftover, 0, start)
      }

      readable.pause()
      await callback(ret)
      readable.resume()
    }

    readable.on('data', consumer).on('end', async () => {
      await callback([leftover])
      resolve()
    })
  })
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
        console.error(`close`, e)
        writer.flush()
        resolve()
      })
      .on('SIGCONT', () => console.error('SIGCONT'))
      .on('SIGINT', () => console.error('SIGINT'))
      .on('SIGTSTP', () => console.error('SIGTSTP'))
  })
}

////////////////////////////////////////////////////////////////////////////////
export function linesMultibackpressedStdPipeable(
  pauser: StreamPauser,
  listener: (line: string, writer: BufferedBackpressWriter) => void,
) {
  exitOnStdoutPipeError()
  return linesBackpressedStd(pauser, listener)
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
export function linesSet(filePath: string) {
  let ret = new Set<string>()
  return new Promise<Set<string>>((resolve, reject) => {
    createInterface(fs.createReadStream(filePath, 'utf8'))
      .on('line', line => ret.add(line))
      .on('close', () => resolve(ret))
      .on('error', reject)
  })
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

//////////////////////////////////////////////////////////////////////////////
export async function joinToStream(
  strings: Iterable<string>,
  stream: NodeJS.WritableStream,
  joiner = '',
  trailing = false,
) {
  let isFirst = true
  for await (let x of strings) {
    if (!isFirst) {
      await writePromiseDrain(stream, joiner)
    } else {
      isFirst = false
    }
    await writePromiseDrain(stream, x)
  }
  if (trailing) {
    await writePromiseDrain(stream, joiner)
  }
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
export function logErrAndExit(e) {
  // console.error(`logErrAndExit at process ${process.pid}`, e)
  process.exit(1)
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
