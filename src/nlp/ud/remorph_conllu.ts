#!/usr/bin/env node

import { forEachLine } from '../../utils.node'
import { canBeConlluLine } from './utils'
import { toUdString } from './tagset'
import { MorphInterp } from '../morph_interp'

if (require.main === module) {
  main()
}

function main() {
  forEachLine(process.stdin, line => {
    if (canBeConlluLine(line)) {
      let cols = line.split('\t')
      let interp = MorphInterp.fromVesumStr(cols[4], cols[2])
      cols[5] = toUdString(interp) || '_'
      process.stdout.write(cols.join('\t') + '\n')
    } else {
      process.stdout.write(line + '\n')
    }
  })
}
