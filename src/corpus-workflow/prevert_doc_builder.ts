import { parseTagStr } from "../xml/utils"
import * as he from "he"
import { normalizeWebParaSafe, fixLatinGlyphMisspell } from "../nlp/utils"



////////////////////////////////////////////////////////////////////////////////
export class PrevertDocBuilder {
  private meta: Array<[string, string]>
  private paragraphs = new Array<string>()
  private curPar = ''

  reset() {
    this.meta = undefined
    this.paragraphs = []
    this.curPar = ''
  }

  // node is an element of split for /(<[^>]+>)/
  feedNode(node: string) {
    if (!node) {
      return
    }

    let tag = parseTagStr(node)
    if (tag) {
      if (tag.isClosing) {
        if (tag.name === 'doc') {
          let ret = {
            paragraphs: this.paragraphs,
            meta: this.meta
          }
          this.reset()
          return ret
        } else if (tag.name === 'p') {
          this.paragraphs.push(normalizeParagraph(this.curPar))
          this.curPar = ''
        }
      } else if (tag.name === 'doc') {
        this.meta = tag.attributes
      }
    } else {
      this.curPar += node
    }
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function normalizeParagraph(p: string) {
  let ret = he.unescape(p)
  ret = normalizeWebParaSafe(p)
  ret = fixLatinGlyphMisspell(ret)

  ret = ret.replace(/[^0\.!?]{4,}/g, '')

  return ret
}
