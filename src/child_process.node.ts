import { exec, execSync, spawn } from 'child_process'
import { tuple } from './lang'



////////////////////////////////////////////////////////////////////////////////
export function execSync2string(command: string) {
  return execSync(command, {
    encoding: 'utf8',
  })
}

////////////////////////////////////////////////////////////////////////////////
export function execPipe(command: string, stdin?: NodeJS.ReadableStream, stdout?: NodeJS.WritableStream) {
  return new Promise<number>((resolve, reject) => {
    let child = exec(command)
      .on('close', resolve)
      .on('error', reject)
    if (stdin) {
      stdin.pipe(child.stdin)
    }
    if (stdout) {
      child.stdout.pipe(stdout)
    }
  })
}

////////////////////////////////////////////////////////////////////////////////
export function spawnPromise(command: string, params: ReadonlyArray<string> = []) {
  let child = spawn(command, params)
  let promise = new Promise<number>((resolve, reject) => {
    child.on('close', resolve)
      .on('error', reject)
  })

  return tuple(child, promise)
}
