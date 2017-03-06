import { createReadStream, ReadStream } from 'fs'
import { Readable, ReadableOptions } from 'stream'



////////////////////////////////////////////////////////////////////////////////
export class CatStreamEnqueueable extends Readable {
  private queue = new Array<string>()
  private index = -1
  private currentReadStream: ReadStream
  private doEndOnDrain = false

  constructor(options?: ReadableOptions) {
    super(options)
  }

  enqueue(filePath: string) {
    this.queue.push(filePath)
    if (!this.currentReadStream) {
      this.streamNext()
    }
  }

  endOnDrain() {
    this.doEndOnDrain = true
  }

  _read(size?: number) {
    if (this.currentReadStream) {
      this.currentReadStream.resume()
    }
  }

  private streamNext() {
    if (++this.index < this.queue.length) {
      this.currentReadStream = createReadStream(this.queue[this.index])
        .on('data', chunk => {
          if (!this.push(chunk)) {
            this.currentReadStream.pause()
          }
        })
        .once('end', () => this.streamNext())
    } else {
      if (this.doEndOnDrain) {
        this.push(null)
      } else {
        this.currentReadStream = undefined
      }
    }
  }
}
