import { writeBackpressing } from "../../stream_utils.node"

import { WriteStream } from "fs"



////////////////////////////////////////////////////////////////////////////////
export class BackpressingWriter {
  constructor(
    private dest: NodeJS.WriteStream | WriteStream,
    private backpressee: NodeJS.ReadableStream
  ) {
  }

  write(what: string | Buffer) {
    writeBackpressing(this.dest, this.backpressee, what)
  }
}
