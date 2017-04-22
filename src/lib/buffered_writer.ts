import { writeSync } from 'fs'

export class BufferedSyncWriter {
  private buf = ''

  constructor(private file: number, private bufSize = 10 ** 7) {
  }

  writeSync(value: string) {
    this.buf += value
    if (this.buf.length > this.bufSize) {
      this.flushSync()
    }
  }

  flushSync() {
    writeSync(this.file, this.buf)
    this.buf = ''
  }
}
