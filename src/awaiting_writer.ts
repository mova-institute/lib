import { writePromiseDrain } from './stream.node'



export class AwaitingWriter {
  private buf = ''
  private bufLength = 1 * 1024 ** 2
  private last = Promise.resolve()

  constructor(private dest: NodeJS.WritableStream) {
  }

  write(what: string | Buffer) {
    this.buf += what
    if (this.buf.length > this.bufLength) {
      return this.flush()
    }
  }

  flush() {
    this.last = new Promise<void>(async (resolve, reject) => {
      await this.last
      await writePromiseDrain(this.dest, this.buf)
      this.buf = ''
      resolve()
    })

    return this.last
  }
}
