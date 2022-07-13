#!/usr/bin/env node

import { BufferedBackpressWriter } from '../backpressing_writer'

function main() {
  process.stdin.setEncoding('utf8')
  let writer = BufferedBackpressWriter.fromStreams(
    process.stdout,
    process.stdin,
  )
  process.stdin
    .on('data', (data: string) => {
      writer.write(data.toLowerCase())
    })
    .on('close', () => writer.flush())
}

if (require.main === module) {
  main()
}
