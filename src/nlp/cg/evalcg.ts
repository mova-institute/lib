#!/usr/bin/env node

import { join } from 'path'
import { sync as globSync } from 'glob'
import * as path from 'path'
import * as fs from 'fs'


if (require.main === module) {
  main()
}

function main() {
  const workspace = '.'
  const targetDir = join(workspace, 'target')
  const inputDir = join(workspace, 'input')
  const outDir = join(workspace, 'out')

  let files = globSync(join(targetDir, '*.cg.txt'))
    .map(x => path.basename(x))
  for (let file of files) {
    let target = fs.readFileSync(join(targetDir, ))
  }
}
