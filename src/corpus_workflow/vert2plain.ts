#!/usr/bin/env node

import { forEachLine } from '../utils.node'



if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
async function main() {
  // try {
  //   await id2i(process.stdin, process.stdout)
  // } catch (e) {
  //   console.error(e.stack)
  // }
  forEachLine(process.stdin, line => {
    if (line.startsWith('<')) {
      // if (/^<g\s*\/>/.test(line)) {

      // }
      return
    }
    // let [word, lemma] = line.split('\t', 2)
    let token = line.substr(0, line.indexOf('\t')).toLowerCase()
    // let token = line
    process.stdout.write(`${token}\n`)
  })
}

// function startsWithCap(str: string) {
//   let first = str.charAt(0)
//   if (first && first === first.toUpperCase()) {
//     return true
//   }
//   return false
// }
