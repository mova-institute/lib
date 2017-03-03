#!/usr/bin / env node

import { Crawler } from './crawler'



const DOMAINS = [
  'www.pravda.com.ua',
  'www.epravda.com.ua',
  'www.eurointegration.com.ua',
  'life.pravda.com.ua',
  'www.istpravda.com.ua',
]

async function main() {
  let crawler = new Crawler(process.argv[2] || 'crawled')
    .setUrlsToSave(({ pathname, hash, hostname }) => {
      // console.log(`testing ${x}`)
      let ret = /^\/(news|articles|columns|digest|short)\/\d{4}\/\d+\/\d+\/\d+\/$/.test(pathname)
        && !hash
        && DOMAINS.includes(hostname)
      return ret
    })
    .setUrlsToFollow([
      x => x && DOMAINS.includes(x.hostname) && /^\/archives\/date_\d+\/$/.test(x.pathname) && !x.search && !x.hash,
      x => x && /^\/archives\/year_\d+\/$/.test(x.pathname) && !x.search && !x.hash,
    ])

  await crawler.seed([
    // 'http://www.istpravda.com.ua/archives/',
    'http://www.pravda.com.ua/archives/',
  ])
}

if (require.main === module) {
  main()
}


//------------------------------------------------------------------------------
function normalizePravdaUrl(url: string) {

}
