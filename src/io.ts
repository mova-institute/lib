import { DrainwaitingBufferedWriter } from './drainwaiting_buffered_writer'
import { lines as rawLines, liness } from './utils.node'


////////////////////////////////////////////////////////////////////////////////
export class Io {
  private dests = new Array<DrainwaitingBufferedWriter>()

  constructor(private source: NodeJS.ReadableStream) {
  }

  getWriter(stream: NodeJS.WritableStream) {
    let ret = new DrainwaitingBufferedWriter(stream)
    this.dests.push(ret)

    return ret
  }

  async *lines() {
    for await (let lines of this.liness()) {
      yield* lines
    }
  }

  async *lines2() {
    for await (let line of rawLines(this.source)) {
      yield line
      await this.allDrained()
    }
    await this.allFlushed()
  }

  async *liness() {
    for await (let lines of liness(this.source)) {
      yield lines
      await this.allDrained()
    }
    await this.allFlushed()
  }

  private allDrained() {
    return Promise.all(this.dests.map(x => x.drained))
  }

  private allFlushed() {
    return Promise.all(this.dests.map(x => x.drained))
  }
}
