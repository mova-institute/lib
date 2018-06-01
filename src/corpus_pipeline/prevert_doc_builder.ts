import { parseTagStr } from '../xml/utils'



////////////////////////////////////////////////////////////////////////////////
export class PrevertDocBuilder {
  private meta = new Array<[string, string]>()
  private paragraphs = new Array<string>()
  private buf = ''

  reset() {
    this.meta = []
    this.paragraphs = []
  }

  feedLine(line: string) {
    line = line.trim()
    if (!line) {
      return
    }

    if (!line.endsWith('>')) {
      this.buf += line
      return
    }

    if (this.buf) {
      line = this.buf += line
      this.buf = ''
    }

    let tag = parseTagStr(line)
    if (!tag) {
      throw new Error(`Unexpected line: not a tag: "${line}"`)
    }

    if (tag.name === 'doc') {
      if (tag.isClosing) {
        let ret = {
          paragraphs: this.paragraphs,
          meta: this.meta,
        }
        this.reset()
        return ret
      }
      this.meta = tag.attributes
    } else if (tag.name === 'p') {
      if (tag.isClosing) {
        throw new Error(`Unexpected </p>`)
      }
      if (!tag.content) {
        throw new Error(`<p> without a content`)
      }
      this.paragraphs.push(tag.content)
    } else {
      throw new Error(`Unexpected tag: "${tag.name}"`)
    }
  }
}
