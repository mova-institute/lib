import { firstMatch } from './string_utils'

import * as conv from 'iconv-lite'
import * as request from 'request-promise-native'
import { CoreOptions } from 'request'



////////////////////////////////////////////////////////////////////////////////
export async function fetchText(url: string, options?: CoreOptions) {
  options = {
    gzip: true,
    forever: true,
    ...options,
    encoding: null,
    resolveWithFullResponse: true,
  }

  let response = await request(url, options)
  let encoding = firstMatch(response.headers['content-type'] as string,
    /.*\bcharset=([\w\-]+)/, 1)
  if (encoding) {
    if (conv.encodingExists(encoding)) {
      return conv.decode(response.body, encoding)
    }
    throw new Error(`Unsupported encoding "${encoding}"`)
  } else {
    // assume utf8 to get html
    let asUtf8 = conv.decode(response.body, 'utf8')
    encoding = firstMatch(asUtf8,
      /<meta\s[^>]*http-equiv\s*=\s*['"]\s*Content-Type\s*['"]\s*[^>]*charset\s*=\s*([\w\-]+)/i, 1)
    if (encoding) {
      if (/utf-?8/i.test(encoding)) {
        return asUtf8
      } else if (conv.encodingExists(encoding)) {
        return conv.decode(response.body, encoding)
      }
      throw new Error(`Unsupported encoding "${encoding}"`)
    }
    throw new Error(`Cannot guess encoding`)
  }
}

////////////////////////////////////////////////////////////////////////////////
export async function reqJson(url: string, options?: CoreOptions) {
  let resStr = await request(url, options)
  return JSON.parse(resStr)
}
