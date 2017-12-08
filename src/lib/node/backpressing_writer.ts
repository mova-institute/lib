import { writeBackpressing } from "../../stream_utils.node"



////////////////////////////////////////////////////////////////////////////////
export class BackpressingWriter {
  constructor(
    private dest: NodeJS.WritableStream,
    private backpressee: NodeJS.ReadableStream
  ) {
  }

  write(what: string | Buffer) {
    writeBackpressing(this.dest, this.backpressee, what)
  }
}
