import { randomBytes, createHash } from 'crypto'



////////////////////////////////////////////////////////////////////////////////
export async function genAccessToken() {
  return new Promise((resolve, reject) => {
    randomBytes(32, (e, buf) => {
      if (e) {
        reject(e)
      } else {
        resolve(buf.toString('base64'))
      }
    })
  })
}

////////////////////////////////////////////////////////////////////////////////
export function hashString(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

////////////////////////////////////////////////////////////////////////////////
export function hashStringLatin1(value: string) {
  return createHash('sha256').update(value).digest('latin1')
}

////////////////////////////////////////////////////////////////////////////////
export function hashObj(value) {
  return hashString(JSON.stringify(value))
}
