#!/usr/bin / env node

import { Crawler } from './crawler'
import { matchNth } from '../../lang'



//------------------------------------------------------------------------------
async function main() {
  let crawler = new Crawler('saved_web', {
    timeout: 3000,
    isUrlToSave: x => x.hostname === 'forum.pravda.com.ua' && /\btopic=\d+\.\d+$/.test(x.search),
    isUrlToFollow: x => x.hostname === 'forum.pravda.com.ua' && /\bboard=\d+\.\d+$/.test(x.search),
    urlPathToFilename(path) {
      let match = matchNth(path, /\btopic=([\d.]+)/, 1)
      if (match) {
        return `/${match.replace('.', '/')}`
      }
      return path
    },
    // enable cookies and you won't need this:
    // urlTransformer: url => url.replace(/PHPSESSID=\w+&?/g, ''),
  })

  await crawler.seed([
    'https://forum.pravda.com.ua/',
  ])
}


////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
