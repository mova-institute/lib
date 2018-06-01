#!/usr/bin/env node

// import { writeFileSync } from 'fs'
// import { join } from 'path'

// import * as glob from 'glob'

import { zip } from '../../lang'
import { DefaultedMap } from '../../lib/defaulted_map'



class Stats {
  constructor(public hit = 0, public miss = 0) { }
}

////////////////////////////////////////////////////////////////////////////////
export function statDiffConllu(linesRight: Iterable<string>, linesLeft: Iterable<string>) {
  let stats = new DefaultedMap<string, Stats>(() => new Stats())
  let linesZipped = zip(linesRight, linesLeft)
  for (let [lineL, lineR] of linesZipped) {
    if (!/^\d/.test(lineL)) {
      continue
    }

  }
}



function main() {
  const args: any = require('minimist')(process.argv.slice(2))

}

if (require.main === module) {
  main()
}
