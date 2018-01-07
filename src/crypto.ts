import { randomBytes } from 'crypto'



////////////////////////////////////////////////////////////////////////////////
export async function genAccessToken() {
  return new Promise((resolve, reject) => {
    randomBytes(32, (e, buf) => {
      if (e) {
        reject(e)
      }
      else {
        resolve(buf.toString('base64'))
      }
    })
  })
}
