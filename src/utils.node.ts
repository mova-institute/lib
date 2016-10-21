import { readFileSync, createReadStream, ReadStream } from 'fs'
import { Readable, Duplex, PassThrough } from 'stream'
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
export function readTsvMapSync(path: string) {
  let ret = new Map<string, string>()
  for (let line of linesSync(path)) {
    let [key, val] = line.split('\t')
    ret.set(key, val)
  }
  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function linesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n')
}

////////////////////////////////////////////////////////////////////////////////
/*export function catToStream(files: string[]) {
  let i=0
  let ret = new Readable()
  let f = () => {
    if (i < files.length) {
      return
    }
    createReadStream(files[i++])
      .on('close', f)
      .pipe(ret)
  }
}*/


////////////////////////////////////////////////////////////////////////////////
export function catFilesStream(paths: Iterable<string>) {
  let ret = new PassThrough()
  ret.readable = true
  ret.on('close', () => console.log('main CLOSEDD'))

  let it = paths[Symbol.iterator]()
  let pipeNext = (cur: IteratorResult<string>) => {
    if (cur.done) {
      // ret.
    } else {
      let next = it.next()
      console.log(`piping ${cur.value}`)
      createReadStream(cur.value)
        .once('end', () => {
          console.log('closed')
          // s.unpipe()
          pipeNext(next)
        })
        .pipe(ret, { end: next.done })
    }
  }
  pipeNext(it.next())

  return ret
}

/*

let it = paths[Symbol.iterator]()
  let go = () => {
    console.log('go called')
    let next = it.next()
    if (!next.done) {
      createReadStream(next.value)
        .once('end', go)
        .pipe(process.stdout)
    }
  }
  go()

let curFileStream: ReadStream
  let ret = new Readable({
    read(size) {
      return curFileStream.read(size)
    },
  })

  let it = paths[Symbol.iterator]()
  let go = () => {
    let next = it.next()
    if (next.done) {
      ret.emit('close')
    } else {
      curFileStream = createReadStream(next.value)
        .once('end', go)
    }
  }
  go()

  return ret

*/