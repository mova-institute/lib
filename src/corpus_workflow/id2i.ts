#!/usr/bin/env node

import { forEachLine } from '../utils.node'



if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
async function main() {
  try {
    let i = 0
    await forEachLine(process.stdin as any, line => {
      if (isSentenceStart(line)) {
        let id = getId(line)
        if (id) {
          process.stdout.write(`${id}\t${i}\n`)
        }
        ++i
      }
    })
  } catch (e) {
    console.error(e.stack)
  }
}

//------------------------------------------------------------------------------
function isSentenceStart(line: string) {
  return /^<s\b/.test(line)
}

//------------------------------------------------------------------------------
function getId(line: string) {
  let match = line.match(/id="([^"]+)"/)
  if (match) {
    return match[1]
  }
}
