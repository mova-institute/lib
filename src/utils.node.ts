// todo: kill

import { readFileSync, statSync } from 'fs'



////////////////////////////////////////////////////////////////////////////////
export function existsSync(path: string) {
  try {
    statSync(path)
    return true
  } catch (e) {
    return false
  }
}

////////////////////////////////////////////////////////////////////////////////
export function* linesSync(filename: string) {  // todo: do not buffer file
  for (let line of readFileSync(filename, 'utf8').split('\n')) {
    yield line
  }
}

////////////////////////////////////////////////////////////////////////////////
export function linesSyncArray(filename: string) {
  return readFileSync(filename, 'utf8').split('\n')
}
