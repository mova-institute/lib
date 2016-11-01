import { exec, execSync } from 'child_process'



////////////////////////////////////////////////////////////////////////////////
export function execSync2String(command: string) {
  return execSync(command, {
    encoding: 'utf8',
  })
}

////////////////////////////////////////////////////////////////////////////////
export function execPipe(command: string, stdin?: NodeJS.ReadableStream, stdout?: NodeJS.WritableStream) {
  return new Promise<number>((resolve, reject) => {
    let cp = exec(command)
      .on('close', resolve)
      .on('error', reject)
    if (stdin) {
      stdin.pipe(cp.stdin)
    }
    if (stdout) {
      cp.stdout.pipe(stdout)
    }
  })
}
