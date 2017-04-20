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
  let ret: {}
  try {
    ret = JSON.parse(resStr)
  } catch (e) {
    if (true || e instanceof SyntaxError) {
      console.error(resStr)
      throw e
    }
  }
  return ret as any
}
