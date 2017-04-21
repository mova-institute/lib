export class BufferedWriter {
  private buf = ''

  constructor(private stream: NodeJS.WritableStream, private bufSize = 10 ** 7) {
  }

  write(value: string) {
    if (this.buf.length + value.length >= this.bufSize) {
      this.stream.write(this.buf + value)
      this.buf = ''
    } else {
      this.buf += value
    }
  }

  flush() {
    this.stream.write('')
    this.buf = ''
  }
}
