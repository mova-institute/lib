import * as fs from 'fs'
import * as path from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as fetch from 'node-fetch'
import * as minimist from 'minimist'

import { FileSavedSet } from '../../file_saved_set.node'
import { FolderSavedMap } from '../../folder_saved_map.node'
import { matchAll, sleep } from '../../lang';


interface Args {
  workspace: string
  seed: number
}

const articleHrefRe = new RegExp(String.raw`<a\s.*href="/number/(\d+)/(\d+)/(\d+)/"`, 'g')

const args: Args = minimist(process.argv.slice(2), {
  boolean: [],
  string: [],
  alias: {
    'workspace': ['ws'],
  },
  default: {
    'seed': 3055,
  },
}) as any


main()


async function main() {
  try {
    let fetchedArticlesDir = path.join(args.workspace, 'fetched_articles')
    mkdirpSync(fetchedArticlesDir)
    let numbersRegistry = new FileSavedSet(path.join(args.workspace, 'fully_fetched_numbers.txt'))
    let articleRegistry = new FolderSavedMap(fetchedArticlesDir)
    let curNumber = args.seed + 1
    while (--curNumber) {
      if (numbersRegistry.has(curNumber.toString())) {
        continue
      }
      console.log(`fetching №${curNumber}`)
      let numberContent = await fetchText(`http://www.umoloda.kiev.ua/number/${curNumber}/`)
      let hrefs = matchAll(numberContent, articleHrefRe).filter(x => x[1] !== '0')
      for (let [, a, b, c] of hrefs) {
        let filename = `${a}_${b}_${c}.html`
        if (!articleRegistry.has(filename)) {
          console.log(`fetching ${filename}`)
          let articleContent = await fetchText(`http://www.umoloda.kiev.ua/number/${a}/${b}/${c}/`)
          articleRegistry.set(filename, articleContent)
          // await sleep(400)
        }
      }
      numbersRegistry.add(curNumber.toString())
    }
  } catch (e) {
    console.error(e)
  }
}

async function fetchText(href: string) {
  let res = await fetch(href, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_6) AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Safari/602.1.50',
    },
  })
  return res.text()
}
