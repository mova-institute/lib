#!/usr/bin / env node

import { Crawler } from './crawler'
import { toSortableDateParts } from '../../date';



const DOMAINS = [
  'www.radiosvoboda.org',
]

async function main() {
  let crawler = new Crawler('saved_web')
    .setUrlsToSave(({ pathname, hash, hostname, protocol }) => {
      let ret = !hash
        && /^\/a\/([^/]+\/)?\d+\.html/.test(pathname)
        && !pathname.startsWith('/a/news/news')
        && !pathname.includes('.html/')
        && DOMAINS.includes(hostname)
        && !DOMAINS.some(x => pathname.includes(x))
        && protocol === 'https:'
        && !pathname.includes('%')
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


  let toSeed = new Array<string>()
  let earliest = new Date(2001, 4, 1).getTime()
  let cur = new Date().getTime()
  while (cur > earliest) {
    let [y, m, d] = toSortableDateParts(new Date(cur))
    await crawler.seed([`https://www.radiosvoboda.org/z/630/${y}/${m}/${d}`])
    cur -= 24 * 3600
  }
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
