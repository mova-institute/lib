#!/usr/bin/env node

import { allLinesFromStdin } from '../utils.node'
import { parseIntStrict } from '../lang'
import { stableSort } from '../algo'


if (require.main === module) {
  main()
}

async function main() {
  let lines = (await allLinesFromStdin())
    .map(x => [x.split('\t').map(xx => parseIntStrict(xx.split(/[:,]/)[0])), x]) as Array<[Array<number>, string]>

  stableSort(lines, (lineA, lineB) => {
    let a = lineA[0]
    let b = lineB[0]
    if (a[0] !== -1 && b[0] !== -1) {
      return a[0] - b[0]
    }
    if (a[0] === -1 && b[0] === -1) {
      return a[1] - b[1]
    }
    if (a[0] === -1 && b[0] !== -1) {
      return a[1] - b[0]
    }
    if (a[0] !== -1 && b[0] === -1) {
      return a[0] - b[1]
    }
    throw new Error()
  })

  lines.forEach(x => process.stdout.write(`${x[1]}\n`))
}
