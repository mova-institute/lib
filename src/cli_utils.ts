import { createReadStream, createWriteStream, rename } from 'fs'
import * as tmp from 'tmp'

const minimist = require('minimist')
tmp.setGracefulCleanup()


////////////////////////////////////////////////////////////////////////////////
// todo: input, output types
export async function ioArgs(filename1: string, filename2: string, f: (input, output) => any) {
  let input
  let output
  let tmpFile

  if (filename2) {
    input = createReadStream(filename1, 'utf8')  // todo
    tmpFile = tmp.fileSync()
    output = createWriteStream(null, { fd: tmpFile.fd })
  }
  else if (filename1) {
    if (process.stdin.isTTY) {
      input = createReadStream(filename1, 'utf8')
      output = process.stdout
    }
    else {
      input = process.stdin
      tmpFile = tmp.fileSync()
      output = createWriteStream(null, { fd: tmpFile.fd })
    }
  }
  else {
    input = process.stdin
    output = process.stdout
  }

  try {
    let res = f(input, output)
    if (res instanceof Promise) {
      await res
      if (tmpFile) {
        await rename(tmpFile.name, filename2 || filename1)
      }
    }
  }
  catch (e) {
    console.error(e.stack)
  }
}

////////////////////////////////////////////////////////////////////////////////
export function ioArgsPlain(f: (input, output) => any, args = minimist(process.argv.slice(2))._) {
  let [filename1, filename2] = args
  ioArgs(filename1, filename2, f)
}
