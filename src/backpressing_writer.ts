import { StreamPauser } from './stream_pauser'



export class BufferedBackpressWriter {
  private buf = ''
  private bufSize = 1024 ** 2

  static fromStreams(source: NodeJS.ReadableStream, dest: NodeJS.WritableStream) {
    return new BufferedBackpressWriter(dest, new StreamPauser(source))
  }

  constructor(
    private dest: NodeJS.WritableStream,
    private pauser: StreamPauser,
  ) {
    if ('writableHighWaterMark' in dest) {
      this.setBufSize((dest as any).writableHighWaterMark / 2 - 1)
    }
  }

  setBufSize(numChars: number) {
    this.bufSize = numChars
    return this
  }

  write(what: string) {
    this.buf += what
    if (this.buf.length > this.bufSize && !this.pauser.isPaused()) {
      return this.flush()
    }
    return true
  }

  writeLn(what: string) {
    return this.write(what) && this.write('\n')
  }

  flush() {
    let ret = this.dest.write(this.buf)
    if (!ret) {
      this.pauser.pause(this)
      this.dest.once('drain', () => this.pauser.resume(this))
    }
    this.buf = ''

    return ret
  }
}
