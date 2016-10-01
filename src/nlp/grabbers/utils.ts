import * as fetch from 'node-fetch'



////////////////////////////////////////////////////////////////////////////////
export async function fetchText(href: string) {
  let res = await fetch(href, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Safari/602.1.50',
    },
  })
  return res.text()
}
