#!/usr/bin/env node

import { forEachLine } from '../utils.node'



if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
async function main() {
  if (process.argv[2] === 'vert2vec') {
    vert2vec()
    return
  }
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

function vert2vec() {
  forEachLine(process.stdin, line => {
    if (line.startsWith('<')) {
      if (line.startsWith('</p>')) {
        process.stdout.write(`\n`)
      }
      return
    } else {
      let [form, , mte] = line.split('\t', 3)
      if (mte !== 'U') {
        process.stdout.write(`${form} `)
      }
    }
  })
}
