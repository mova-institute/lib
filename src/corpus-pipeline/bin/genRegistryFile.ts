#!/usr/bin/env node

import { generateRegistryFile } from '../registry_file_builder';

import * as minimist from 'minimist'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function main() {
  const args = minimist(process.argv.slice(2)) as any
  delete args._
  let res = generateRegistryFile(args).corpus
  process.stdout.write(res)
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
