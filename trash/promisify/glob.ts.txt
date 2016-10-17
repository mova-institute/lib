import * as glob from 'glob'



////////////////////////////////////////////////////////////////////////////////
export function promiseGlob(pattern: string) {
  return new Promise<string[]>((resolve, reject) => {
    glob(pattern, (e, files) => {
      if (e) {
        reject(e)
      } else {
        resolve(files)
      }
    })
  })
}
