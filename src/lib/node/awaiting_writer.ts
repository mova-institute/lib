import { writePromiseDrain } from '../../stream_utils.node'

import { last } from 'lodash'



////////////////////////////////////////////////////////////////////////////////
export class AwaitingWriter {
  private last = Promise.resolve()

  constructor(private dest: NodeJS.WritableStream) {
  }

  write(what: string | Buffer) {
    this.last = new Promise<void>(async (resolve, reject) => {
      await this.last
      await writePromiseDrain(this.dest, what)
      resolve()
    })

    return this.last
  }
}
