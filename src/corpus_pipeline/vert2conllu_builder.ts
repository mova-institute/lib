import { parseTagStr } from '../xml/utils'
import { last } from '../lang'

import * as he from 'he'
import { loopReplace } from '../string'



const MIDDLE_PADDER = '\t_'.repeat(7) + '\t'

////////////////////////////////////////////////////////////////////////////////
export class Vert2conlluBuilder {
  private buf = new Array<string>()
  private sentIdGen = 0
  private curTokNum: number

  reset() {
    this.buf = []
  }



  feedLine(line: string) {
    if (!line) {
      return
    }

    if (line.startsWith('<')) {
      line = loopReplace(line, /("[^"]*)\\"/g, '$1&quot;')
    }
    let tag = parseTagStr(line)
    if (tag) {
      if (tag.name === 'gap') {
        this.buf.push('# gap')
      } else if (tag.name === 'g') {
        this.addLastMisc('SpaceAfter=No')
      }

      if (tag.isClosing) {
        if (tag.name === 'doc') {
          // let ret = {
          //   conllu: this.buf,
          //   meta: this.meta,
          // }
          this.buf.push('')
          let ret = this.buf
          this.reset()
          return ret
        } else if (tag.name === 's') {
          this.closeLastTok()
          this.buf.push('')
        }
      } else if (tag.name === 'doc') {
        // this.meta = tag.attributes
      } else if (tag.name === 's') {
        this.buf.push(`# sent_id = ${++this.sentIdGen}`)
        this.curTokNum = 0
      } else if (tag.name === 'p') {
        if (!last(this.buf)) {
          this.buf.push('# newpar')
        } else {
          this.addLastMisc('NewPar=Yes')
        }
      }
    } else {
      this.closeLastTok()
      this.buf.push(`${++this.curTokNum}\t${he.unescape(line)}${MIDDLE_PADDER}`)
    }
  }

  private closeLastTok() {
    if (this.buf.length && last(this.buf).endsWith('\t')) {
      this.buf[this.buf.length - 1] += '_'
    }
  }

  private addLastMisc(keyval: string) {
    if (!last(this.buf).endsWith('\t')) {
      this.buf[this.buf.length - 1] += '|'
    }
    this.buf[this.buf.length - 1] += keyval
  }
}
