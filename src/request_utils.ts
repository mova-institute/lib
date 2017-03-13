import * as request from 'request'



////////////////////////////////////////////////////////////////////////////////
export function fetchText(href: string, options?: request.CoreOptions) {
  return new Promise<string>((resolve, reject) => {
    request(href, options, (err, res, body) => {
      if (err) {
        reject(err)
      }
      resolve(body)
    })
  })
}

////////////////////////////////////////////////////////////////////////////////
export async function fetchJson(href: string, options?: request.CoreOptions) {
  let resStr = await fetchText(href, options)
  return JSON.parse(resStr)
}
