import { writeBackpressing } from '../../stream_utils.node'



////////////////////////////////////////////////////////////////////////////////
export class BackpressingWriter {
  private buf = ''
  private bufLength = 1 * 1024 ** 2

  constructor(
    private dest: NodeJS.WritableStream,
    private backpressee: NodeJS.ReadableStream,
  ) {
  }

  write(what: string | Buffer) {
    this.buf += what
    if (this.buf.length > this.bufLength) {
      this.flush()
    }
  }

  flush() {
    writeBackpressing(this.dest, this.backpressee, this.buf)
    this.buf = ''
  }
}
