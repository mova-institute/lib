#!/usr/bin / env node

import { Crawler } from './crawler'



const DOMAINS = [
  'www.radiosvoboda.org',
]

async function main() {
  let crawler = new Crawler('saved_web')
    .setUrlsToSave(({ pathname, hash, hostname, protocol }) => {
      let ret = !hash
        && /^\/a\//.test(pathname)
        && DOMAINS.includes(hostname)
        && !DOMAINS.some(x => pathname.includes(x))
        && protocol === 'https:'
      return ret
    })
    .setUrlsToFollow([
      x => x
        && DOMAINS.includes(x.hostname)
        && /^\/archives\/date_\d+\/$/.test(x.pathname)
        && !x.search
        && !x.hash
        && !DOMAINS.some(xx => x.pathname.includes(xx))
        && x.protocol === 'https:',
    ])

  await crawler.seed([
    'https://www.radiosvoboda.org/',
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
