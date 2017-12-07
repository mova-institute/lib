#!/usr/bin/env node

import { linesAsyncStd, ignorePipeErrors } from '../utils.node';

import * as fs from 'fs'



//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  ignorePipeErrors()

  let file = process.argv[2]
  await linesAsyncStd(async line => {
    if (!line) {
      return
    }

    let [offset, length] = line.match(/^(\d+)\s+(\d+)/).slice(1).map(x => Number(x))
    let readStream = fs.createReadStream(file, {
      start: offset,
      end: offset + length - 1,
    })

    await new Promise((resolve, reject) =>
      readStream
        .on('end', resolve)
        .on('error', e => { console.error(e); reject() })
        .pipe(process.stdout)
    )
  })
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
