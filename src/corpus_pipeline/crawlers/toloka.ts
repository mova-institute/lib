#!/usr/bin / env node

import { Crawler } from './crawler'



//------------------------------------------------------------------------------
async function main() {
  let crawler = new Crawler('saved_web')
    .setTimeout(3000)
    .setUrlsToSave(({ path }) => isTopicPage(path))
    .setUrlsToFollow([
      x => x.hostname === 'toloka.to' && /^\/f\d+$/.test(x.path)
    ])

  await crawler.seed('https://toloka.to')
}

//------------------------------------------------------------------------------
function isTopicPage(path: string) {
  let match = path.match(/^\/t\d+(-\d+)$/)
  if (!match) {
    return false
  }

  return !match[1] || !(Number(match[1]) % 30)
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
