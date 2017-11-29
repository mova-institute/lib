#!/usr/bin/env node

import { linesCb } from '../../utils.node';



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  process.stdin.setEncoding('utf8')

  let insideGap = false
  await linesCb(process.stdin, async (lines, ready) => {
    for (let line of lines) {
      if (insideGap) {
        if (!line.startsWith('1')) {
          insideGap = false
          process.stdout.write(`${line.substr(2)}\n`)
        }
      } else {
        if (line.startsWith('1')) {
          insideGap = true
          process.stdout.write(`<gap type="dupe"/>\n`)
        } else {
          process.stdout.write(`${line.substr(2)}\n`)
        }
      }
    }
    ready()
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
