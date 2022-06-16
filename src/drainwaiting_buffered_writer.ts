export class DrainwaitingBufferedWriter {
  private buf = ''
  private bufSize = 1024 ** 2
  private drainPromise = Promise.resolve()
  private drainListener: () => void

  constructor(private stream: NodeJS.WritableStream) {
    if ('writableHighWaterMark' in stream) {
      this.bufSize = stream['writableHighWaterMark']// / 2 - 1
    }
  }

  get drained() {
    return this.drainPromise
  }

  write(what: string) {
    this.buf += what
    if (this.buf.length > this.bufSize) { // todo: buffer?
      return this.flush()
    }

    return true
  }

  writeLn(what: string) {
    let ok1 = this.write(what)
    let ok2 = this.write('\n')

    return ok1 && ok2
  }

  flush() {
    if (this.buf) {
      let ret = this.stream.write(this.buf)
      this.buf = ''
      if (!ret) {
        if (this.drainListener) {
          this.stream.off('drain', this.drainListener)
        }

        this.drainPromise = new Promise((resolve, reject) => {
          this.drainListener = () => {
            this.drainListener = undefined
            resolve()
          }
          this.stream.once('drain', this.drainListener)
        })
      }
    }

    return !this.drainListener
  }
}
