import { join } from 'path'



export function getLibRootRelative(...path: Array<string>) {
  return join(__dirname, ...path)
}
