import { writePromiseDrain } from "../../stream_utils.node"



////////////////////////////////////////////////////////////////////////////////
export class AwaitingWriter {
  constructor(private dest: NodeJS.WritableStream) {
  }

  write(what: string | Buffer) {
    return writePromiseDrain(this.dest, what)
  }
}
