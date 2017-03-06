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
  'health|culture|society|travel|columns'
  let crawler = new Crawler(process.argv[2] || 'crawled')
    .setUrlsToSave(({ pathname, hash, hostname }) => {
      // if (hostname === 'life.pravda.com.ua') {

      // }
      // console.log(`testing ${x}`)
      let ret = /^\/(news|articles|columns|digest|short|health|culture|society|travel|interview)\/\d{4}\/\d+\/\d+\/\d+\/$/.test(pathname)
        && !hash
        && DOMAINS.includes(hostname)
      return ret
    })
    .setUrlsToFollow([
      x => x && DOMAINS.includes(x.hostname) && /^\/archives\/date_\d+\/$/.test(x.pathname) && !x.search && !x.hash,
      x => x && /^\/archives\/year_\d+\/$/.test(x.pathname) && !x.search && !x.hash,
    ])

  await crawler.seed([
    // 'http://www.pravda.com.ua/archives/',
    // 'http://www.istpravda.com.ua/archives/',
    'http://www.epravda.com.ua/archives/',
    'http://life.pravda.com.ua/archives/',
    'http://www.eurointegration.com.ua/archives/',
  ])
}

if (require.main === module) {
  main()
}


//------------------------------------------------------------------------------
function getUrlsToSaveReForSections(sections: string[]) {
  return new RegExp(`^\/(${sections.join('|')})\/\d{4}\/\d+\/\d+\/\d+\/$`)
}

//------------------------------------------------------------------------------
function normalizePravdaUrl(url: string) {

}
