import { VesumLineDescriptor } from './vesum_line_descriptor'
import { VesumLineIterator } from './vesum_line_iterator'



////////////////////////////////////////////////////////////////////////////////
export class VesumLexemeIterator {
  private buffer = new Array<VesumLineDescriptor>()
  private lineIterator = new VesumLineIterator()

  feedLine(line: string) {
    this.lineIterator.feedLine(line)
    if (this.buffer.length && this.lineIterator.line.isLemma) {
      let ret = this.buffer
      this.buffer = [this.lineIterator.getLine()]
      return ret
    } else {
      this.buffer.push(this.lineIterator.getLine())
    }
  }

  flush() {
    let ret = this.buffer
    this.buffer = []
    return ret
  }
}
