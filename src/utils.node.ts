// todo: kill

import { readFileSync } from 'fs'



////////////////////////////////////////////////////////////////////////////////
export function* linesSync(filename: string) {  // todo: do not buffer file
  for (let line of readFileSync(filename, 'utf8').split('\n')) {
    yield line
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* nonemptyLinesSync(filename: string) {
  for (let line of linesSync(filename)) {
    line = line.trim()
    if (line) {
      yield line
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function linesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n')
}
