#!/usr/bin/env node --max_old_space_size=4096

import { forEachLine } from '../utils.node'



if (require.main === module) {
  main()
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  try {
    await id2i(process.stdin, process.stdout)
  } catch (e) {
    console.error(e.stack)
  }
}

////////////////////////////////////////////////////////////////////////////////
export function id2i(input: NodeJS.ReadableStream, output: NodeJS.WritableStream) {
  let i = 0
  return forEachLine(input as any, line => {
    if (isSentenceStart(line)) {
      let id = getId(line)
      if (id) {
        output.write(`${id}\t${i}\n`)
      }
      ++i
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
export function isSentenceStart(line: string) {
  return /^<s\b/.test(line)
}

////////////////////////////////////////////////////////////////////////////////
export function getId(line: string) {
  let match = line.match(/id="([^"]+)"/)
  if (match) {
    return match[1]
  }
}
