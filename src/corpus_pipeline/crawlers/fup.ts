#!/usr/bin / env node

import { Crawler } from './crawler'
import { matchGroup } from '../../lang'

import { Url } from 'url'

async function main() {
  let crawler = new Crawler('saved_web', {
    delay: 3000,
    numRetries: 1,
    retryTimeout: 10000,
    isUrlToSave: (x) =>
      isFup(x) && /^\/index\.php\?topic=\d+\.\d+$/.test(x.path),
    isUrlToFollow: (x) => isFup(x) && /\bboard=\d+\.\d+$/.test(x.search),
    urlPathToFilename(path) {
      let match = matchGroup(path, /\btopic=([\d.]+)/, 1)
      if (match) {
        return `/${match.replace('.', '/')}`
      }
      return path
    },
    // enable cookies and you won't need this:
    // urlTransformer: url => url.replace(/PHPSESSID=\w+&?/g, ''),
  })

  await crawler.seed('https://forum.pravda.com.ua/')
}

function isFup(url: Url) {
  return url.protocol === 'https:' && url.hostname === 'forum.pravda.com.ua'
}

if (require.main === module) {
  main()
}
