////////////////////////////////////////////////////////////////////////////////
export class DrainwaitingBufferedWriter {
  private buf = ''
  private bufSize = 1024 ** 2
  private drainPromise = Promise.resolve()
  private isDraining = false

  constructor(private stream: NodeJS.WritableStream) {
    if ('writableHighWaterMark' in stream) {
      this.bufSize = stream['writableHighWaterMark'] / 2 - 1
    }
  }

  get drained() {
    return this.drainPromise
  }

  write(what: string) {
    this.buf += what
    if (this.buf.length > this.bufSize) { // todo: buffer?
      this.flush()
    }

    return !this.isDraining
  }

  writeLn(what: string) {
    let ok1 = this.write(what)
    let ok2 = this.write('\n')

    return ok1 && ok2
  }

  flush() {
    let ret = this.stream.write(this.buf)
    if (!ret && !this.isDraining) {
      this.isDraining = true
      this.drainPromise = new Promise((resolve, reject) => {
        this.stream.once('drain', () => {
          this.isDraining = true
          resolve()
        })
      })
    }
    this.buf = ''

    return !this.drainPromise
  }
}
