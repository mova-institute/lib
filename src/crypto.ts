import { randomBytes } from 'crypto'



////////////////////////////////////////////////////////////////////////////////
export async function genAccessToken() {
  return new Promise((resolve, reject) => {
    randomBytes(48, (e, buf) => {
      if (e) {
        reject(e)
      }
      else {
        resolve(buf.toString('hex'))
      }
    })
  })
}
