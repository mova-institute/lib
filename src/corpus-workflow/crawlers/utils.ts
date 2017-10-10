import * as request from 'request'
import * as conv from 'iconv-lite'

import { Agent } from 'http'


const agent = new Agent({
  keepAlive: true,
})

////////////////////////////////////////////////////////////////////////////////
export function fetchText(href: string) {
  return new Promise<string>((resolve, reject) => {
    request(href, {
      agent,
      gzip: true,
      encoding: null,  // to get Buffer
      headers: {
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/602.4.8 (KHTML, like Gecko) Version/10.0.3 Safari/602.4.8`
      }
    }, (er, res, body: Buffer) => {
      if (er) {
        reject(er)
        return
      }

      let contentType = res.headers['content-type'] as string
      let match = contentType.match(/.*\bcharset=([\w\-]+)/)
      if (match) {
        let encoding = match[1]
        if (conv.encodingExists(encoding)) {
          resolve(conv.decode(body, encoding))
          return
        } else {
          console.error(`Unsupported encoding ${encoding}`)
          reject(new Error(`Unsupported encoding ${encoding}`))
        }
      } else {
        console.error(`No encoding string`)
        reject(new Error(`No encoding string`))
      }
    })
  })
}
