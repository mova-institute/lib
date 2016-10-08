import { VesumLineDescriptor } from './vesum_line_descriptor'
import * as clone from 'lodash/clone'


////////////////////////////////////////////////////////////////////////////////
export class VesumLineIterator {
  static readonly indenter = '  '

  line = new VesumLineDescriptor()

  feedLine(line: string) {
    ++this.line.lineIndex
    this.line.isLemma = !line.startsWith(VesumLineIterator.indenter)
    let l = line.trim()
    if (l) {
      l = l.replace(/'/g, '’');  // fix apostrophe
      [this.line.form, this.line.tag] = l.split(' ')
      if (this.line.isLemma) {
        this.line.lemma = this.line.form
        this.line.lemmaTag = this.line.tag
      }
    }
  }

  getLine() {
    return clone(this.line)
  }
}
