import { createReadStream, ReadStream } from 'fs'
import { Readable, ReadableOptions } from 'stream'

export class CatStream extends Readable {
  private currentReadStream: ReadStream
  private iterator: Iterator<string>

  constructor(paths: Iterable<string>, options?: ReadableOptions) {
    super(options)
    this.iterator = paths[Symbol.iterator]()
    this.streamNext()
  }

  _read(size?: number) {
    this.currentReadStream.resume()
  }

  private streamNext() {
    let { value, done } = this.iterator.next()
    if (done) {
      this.push(null)
    } else {
      this.currentReadStream = createReadStream(value)
        .on('data', (chunk) => {
          if (!this.push(chunk)) {
            this.currentReadStream.pause()
          }
        })
        .once('end', () => this.streamNext())
    }
  }
}
