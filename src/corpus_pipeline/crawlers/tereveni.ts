#!/usr/bin / env node

import { Crawler } from './crawler'



//------------------------------------------------------------------------------
async function main() {
  let crawler = new Crawler('saved_web')
    .setUrlsToSave(({ pathname }) => isForumPage(pathname))
    .setUrlsToFollow([
      x => isForumPage(x.pathname),
      x => /\/forum\/\d+\/(page__prune_day\S*)?$/.test(x.pathname),
    ])

  await crawler.seed('http://tereveni.org/index')
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
function isForumPage(pathname: string) {
  return /\/topic\/\d+\/(page__st__\d+)?$/.test(pathname)
}
