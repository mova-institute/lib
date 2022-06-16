import { parseTagStr } from '../xml/utils'
import { Dict } from '../types'
import he = require('he')



export class PrevertDocBuilder {
  private meta: Dict<string>
  private paragraphs: Array<string>
  private buf = ''

  constructor() {
    this.reset()
  }

  reset() {
    this.meta = {}
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
      this.paragraphs.push(he.unescape(tag.content))
    } else {
      throw new Error(`Unexpected tag: "${tag.name}"`)
    }
  }
}

export async function* itPrevertDocs(lines: AsyncIterableIterator<string>) {
  let docBuilder = new PrevertDocBuilder()
  for await (let line of lines) {
    let doc = docBuilder.feedLine(line)
    if (doc) {
      yield doc
    }
  }
}
