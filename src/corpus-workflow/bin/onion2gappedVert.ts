#!/usr/bin/env node

import { ignorePipeErrors, linesBackpressed } from '../../utils.node';
import { writeBackpressed } from '../../stream_utils.node';



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {  // todo: make it binary and faster
  ignorePipeErrors()

  let insideGap = false
  await linesBackpressed(process.stdin, process.stdout, (line, write) => {
    if (line.startsWith('1')) {
      insideGap = true
    } else if (insideGap) {
      write(`<gap type="dupe"/>\n`)
      insideGap = false
    } else {
      write(`${line.substr(2)}\n`)
    }
  })
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// bin alternative in development
async function main2() {
  ignorePipeErrors()

  const binNewline = Buffer.from('\n')
  const binOne = Buffer.from('1')
  const binGap = Buffer.from('<gap type="dupe"/>\n')

  process.stdin.on('data', (buf: Buffer) => {
    let start = 0
    let end = -1
    while ((end = buf.indexOf(binNewline, start)) >= 0) {
      writeBackpressed(process.stdout, process.stdin, buf.slice(0, start))
      start = end + 1
      if (start < buf.length) {

      }
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
