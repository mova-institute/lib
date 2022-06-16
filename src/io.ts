import { DrainwaitingBufferedWriter } from './drainwaiting_buffered_writer'
import { lines as rawLines, liness, createWriteStreamMkdirpSync } from './utils.node'
import { amu } from './async_mu'


export class Io {
  static std() {
    return new Io(process.stdin)
  }

  private dests = new Array<DrainwaitingBufferedWriter>()

  constructor(private source: NodeJS.ReadableStream) {
  }

  getWriter(stream: NodeJS.WritableStream) {
    let ret = new DrainwaitingBufferedWriter(stream)
    this.dests.push(ret)

    return ret
  }

  getFileWriter(path: string) {
    let stream = createWriteStreamMkdirpSync(path)
    return this.getWriter(stream)
  }

  linesMu() {
    return amu(this.lines())
  }

  async *chunks() {
    for await (let chunk of this.source) {
      yield chunk as string
    }
    await this.flushAllAndDrain()
  }

  async *lines() {
    for await (let lines of liness(this.source)) {
      yield* lines
      await this.allDrained()
    }
    await this.flushAllAndDrain()
  }

  // lines() {
  //   return this.lines2()
  // }

  async *lines2() {
    for await (let line of rawLines(this.source)) {
      yield line
      await this.allDrained()
    }
    await this.flushAllAndDrain()
  }

  // async *liness() {
  //   for await (let lines of liness(this.source)) {
  //     yield lines
  //     await this.allDrained()
  //   }
  //   await this.flushAllAndDrain()
  // }

  private allDrained() {
    return Promise.all(this.dests.map(x => x.drained))
  }

  private async flushAllAndDrain() {
    this.dests.forEach(x => x.flush())
    await this.allDrained()
  }
}
