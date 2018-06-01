#!/usr/bin/env node

import { generateRegistryFileUk } from '../registry_file_builder'

import * as minimist from 'minimist'



//------------------------------------------------------------------------------
function main() {
  const args = minimist<any>(process.argv.slice(2))
  delete args._
  let res = generateRegistryFileUk(args)
  process.stdout.write(res)
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
