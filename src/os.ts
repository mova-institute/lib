import { cpus } from 'os'



export function numThreads() {
  return cpus().length
}
