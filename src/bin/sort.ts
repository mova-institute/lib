#!/usr/bin/env node --max_old_space_size=4096

import { linesStreamSync } from '../utils.node'


function main() {
  const args = require('minimist')(process.argv.slice(2), {
    boolean: [
      'unique',
    ],
  })

  const collator = new Intl.Collator('uk-dict-UA', {
    sensitivity: 'base',
    //ignorePunctuation: true,
    //localeMatcher: 'lookup',
    //numeric: true,
    // caseFirst: 'upper',
  })

  console.error(`uniqueing…`)
  let arr = [...new Set(linesStreamSync(process.argv[2]))]
  console.error(`sorting…`)
  process.stdout.write(arr.sort(collator.compare).join('\n'))

  // ioArgsPlain(async (input, output) => {
  //   console.error(`reading…`)
  //   let inputStr = await readTillEnd(input)
  //   let arr = inputStr.split('\n')
  //   if (args.unique) {
  //     arr = [...new Set(arr)]
  //   }
  //   output.write(arr.sort(collator.compare).join('\n'))
  // })
}

if (require.main === module) {
  main()
}
