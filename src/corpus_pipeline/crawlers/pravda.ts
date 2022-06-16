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
  // 'health|culture|society|travel|columns'
  let crawler = new Crawler('saved_web', {
    readFromSaved: false,
  })
    .setUrlsToSave(({ path, hostname, protocol }) => {
      // if (hostname === 'life.pravda.com.ua') {

      // }
      // console.log(`testing ${x}`)
      let ret =
        /^\/(news|articles|columns|digest|short|health|culture|society|travel|interview)\/\d{4}\/\d+\/\d+\/\d+\/$/.test(
          path,
        ) &&
        DOMAINS.includes(hostname) &&
        protocol === 'https:'
      return ret
    })
    .setUrlsToFollow([
      (x) =>
        x &&
        DOMAINS.includes(x.hostname) &&
        /^\/archives\/date_\d+\/$/.test(x.pathname) &&
        !x.search &&
        x.protocol === 'https:',
      (x) =>
        x &&
        DOMAINS.includes(x.hostname) &&
        /^\/archives\/year_\d+\/$/.test(x.pathname) &&
        !x.search &&
        x.protocol === 'https:',
    ])

  await crawler.seedAll([
    'https://www.pravda.com.ua/archives/',
    'https://www.istpravda.com.ua/archives/',
    'https://www.epravda.com.ua/archives/',
    'https://life.pravda.com.ua/archives/',
    'https://www.eurointegration.com.ua/archives/',
  ])
}

if (require.main === module) {
  main()
}
