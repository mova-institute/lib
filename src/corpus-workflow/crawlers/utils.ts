import * as request from 'request'
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
      headers: {
        'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/602.4.8 (KHTML, like Gecko) Version/10.0.3 Safari/602.4.8 mova.institute crawler`
      }
    }, (er, res, body) => {
      resolve(body)
    })
  })
}
