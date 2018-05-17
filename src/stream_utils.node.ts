import { Readable } from 'stream'


////////////////////////////////////////////////////////////////////////////////
export function writePromiseDrain(
  to: NodeJS.WritableStream,
  what: string | Buffer,
) {
  if (!to.write(what)) {
    return new Promise<void>((resolve, reject) => {
      to.on('error', reject)
        .once('drain', () => {
          to.removeListener('error', reject)
          resolve()
        })
    })
  }
}

////////////////////////////////////////////////////////////////////////////////
export function writeBackpressing(
  to: NodeJS.WritableStream,
  backpressee: NodeJS.ReadableStream,
  what: string | Buffer,
) {
  if (!to.write(what) && !backpressee.isPaused()) {
    backpressee.pause()
    to.once('drain', () => backpressee.resume())  // =bind?
  }
}

////////////////////////////////////////////////////////////////////////////////
export function writeBackpressedStd(what: string | Buffer) {
  return writeBackpressing(process.stdout, process.stdin, what)
}

////////////////////////////////////////////////////////////////////////////////
export function readNBytes(n: number, istream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {

    let waitUntilNBytes = () => {
      let buf = istream.read(n)
      if (buf) {
        resolve(buf)
      } else {
        istream.once('readable', waitUntilNBytes)
      }
    }

    waitUntilNBytes()
    reject()  // todo
    throw new Error('should never happen')
  })
}

////////////////////////////////////////////////////////////////////////////////
export function readTillEnd(istream: Readable): Promise<string> {
  let ret = ''

  return new Promise((resolve, reject) => {

    istream.on('data', chunk => ret += chunk)
      .on('end', () => resolve(ret))

  })
}
