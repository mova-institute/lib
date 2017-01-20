#!/usr/bin/env node

import { writeFileSync } from 'fs'
// import { join } from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { linesSync } from '../../utils.node'
import { adoptRelationsFromBrat } from '../../nlp/utils'

import * as glob from 'glob'



function main() {
  const args: any = require('minimist')(process.argv.slice(2))
  let root = parseXmlFileSync(args._[0])
  adoptRelationsFromBrat(root, linesSync(args._[1]))
  writeFileSync(args._[0], root.serialize())
}

if (require.main === module) {
  main()
}
