import { execSync } from 'child_process'



////////////////////////////////////////////////////////////////////////////////
export function putFileSshSync(hostname: string, user: string, path: string, content: string) {
  return execRemoteInlpaceSync(hostname, user, `cat - > '${path}'`, content)
}

////////////////////////////////////////////////////////////////////////////////
export function execRemoteInlpaceSync(hostname: string, user: string, command: string, input?: string) {
  return execSync(`ssh -C ${user}@${hostname} '${command}'`, {
    encoding: 'utf8',
    input,
    stdio: [undefined, process.stdout, process.stderr],
  })
}
