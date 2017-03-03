import * as fetch from 'node-fetch'
import { LibxmljsDocument, LibxmljsElement } from 'xmlapi-libxmljs'
import { parseHtmlString } from 'libxmljs'
import { Agent } from 'http'


const agent = new Agent({
  keepAlive: true,
})

////////////////////////////////////////////////////////////////////////////////
export async function fetchText(href: string) {
  let res = await fetch(href, {
    headers: {
      // 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Safari/602.1.50',
      'User-Agent': `Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_3) AppleWebKit/602.4.8 (KHTML, like Gecko) Version/10.0.3 Safari/602.4.8`,
      redirect: 'error',
    },
    // agent,
  } as any)  // todo: correct types
  return res.text()
}
