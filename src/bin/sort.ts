#!/usr/bin/env node --max_old_space_size=4096

import { ioArgsPlain } from '../cli_utils'
import { readTillEnd } from '../stream_utils.node'

const collator = new Intl.Collator('uk-dict-UA', {
  sensitivity: 'base',
  //ignorePunctuation: true,
  //localeMatcher: 'lookup',
  //numeric: true,
  caseFirst: 'upper',
})

ioArgsPlain(async (input, output) => {
  let inputStr = await readTillEnd(input)
  output.write(inputStr.split('\n').filter(x => x).sort(collator.compare).join('\n'))
})
