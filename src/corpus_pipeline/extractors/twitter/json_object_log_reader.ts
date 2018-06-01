////////////////////////////////////////////////////////////////////////////////
export class JsonObjectLogReader {
  private buf = ''
  private lineN = 0
  private ignoreErrors = false

  feed(line: string) {
    ++this.lineN
    this.buf += line
    if (line === '}') {
      try {
        var ret = JSON.parse(this.buf)
      } catch (e) {
        console.error(`Error at line ${this.lineN}`)
        // console.error(this.buf)
        if (this.ignoreErrors) {
          this.buf = ''
          return
        }
        throw e
      }
      this.buf = ''
      return ret
    } else {
      this.buf += '\n'
    }
  }

  setIgnoreErrors(value = true) {
    this.ignoreErrors = value
    return this
  }
}
