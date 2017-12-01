import { parseTagStr } from "../xml/utils";
import * as he from "he";
import { normalizeWebParaSafe, fixLatinGlyphMisspell } from "../nlp/utils";



////////////////////////////////////////////////////////////////////////////////
export class PrevertDocBuilder {
  private meta: Array<[string, string]>
  private paragraphs = new Array<string>()
  private curPar = ''

  // node is an element of split for /(<[^>]+>)/
  feedNode(node: string) {
    if (!node) {
      return
    }

    let tag = parseTagStr(node)
    if (tag) {
      if (tag.isClosing) {
        if (tag.name === 'doc') {
          return {
            paragraphs: this.paragraphs,
            meta: this.meta
          }
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

  return ret
}
