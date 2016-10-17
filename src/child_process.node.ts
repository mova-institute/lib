import { execSync } from 'child_process'



////////////////////////////////////////////////////////////////////////////////
export function execSync2String(command: string) {
  return execSync(command, {
    encoding: 'utf8',
  })
}
