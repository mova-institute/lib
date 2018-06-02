////////////////////////////////////////////////////////////////////////////////
export class StreamPauser {
  private pausers = new Set<any>()

  constructor(private stream: NodeJS.ReadableStream) {
  }

  pause(pauser: any) {
    this.pausers.add(pauser)
    this.poke()
  }

  resume(pauser: any) {
    this.pausers.delete(pauser)
    this.poke()
  }

  private poke() {
    // console.error(this.pausers.size)
    if (this.pausers.size && !this.stream.isPaused()) {
      // console.error(`pausing`)
      this.stream.pause()
    } else if (!this.pausers.size && this.stream.isPaused()) {
      // console.error(`resumin`)
      this.stream.resume()
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export class BufferedBackpressWriter {
  private buf = ''
  private bufSize = 1024 ** 2
  private onDrainBinded = this.onDrain.bind(this)

  constructor(
    private dest: NodeJS.WritableStream,
    private backpressee: NodeJS.ReadableStream,
    private pauser = new StreamPauser(backpressee)
  ) {
  }

  setBufSize(numChars: number) {
    this.bufSize = numChars
    return this
  }

  write(what: string) {
    this.buf += what
    if (this.buf.length > this.bufSize) {
      this.flush()
    }
  }

  flush() {
    if (!this.dest.write(this.buf)) {
      this.pauser.pause(this)
      this.dest.once('drain', this.onDrainBinded)
    }
    this.buf = ''
  }

  private onDrain() {
    this.pauser.resume(this)
  }
}
