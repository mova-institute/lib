import { createReadStream, ReadStream } from 'fs'
import { Readable, ReadableOptions } from 'stream'

export class CatStreamEnqueueable extends Readable {
  private queue = new Array<string>()
  private currentReadStream: ReadStream
  private endOnDrain = false

  constructor(options?: ReadableOptions) {
    super(options)
  }

  _read(size?: number) {
    if (this.currentReadStream) {
      this.currentReadStream.resume()
    }
  }

  enqueue(filePath: string) {
    this.queue.push(filePath)
    if (!this.currentReadStream) {
      this.streamNext()
    }
    return this
  }

  setEndOnDrain(value = true) {
    this.endOnDrain = value
    return this
  }

  private streamNext() {
    if (this.queue.length) {
      this.currentReadStream = createReadStream(this.queue.shift())
        .on('data', (chunk) => {
          if (!this.push(chunk)) {
            this.currentReadStream.pause()
          }
        })
        .once('end', this.streamNext)
    } else {
      if (this.endOnDrain) {
        this.push(null)
      } else {
        this.currentReadStream = undefined
      }
    }
  }
}
