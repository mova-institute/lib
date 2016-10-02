import * as path from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as minimist from 'minimist'

import { FileSavedSet } from '../../file_saved_set.node'
import { FolderSavedMap } from '../../folder_saved_map.node'
import { matchAll, sleep } from '../../lang';
import { fetchText } from './utils'


interface Args {
  workspace: string
  seed: number
}

const articleHrefRe = new RegExp(String.raw`<a\s.*href="/number/(\d+)/(\d+)/(\d+)/"`, 'g')

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
    },
    default: {
      'seed': 3055,
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    let fetchedArticlesDir = path.join(args.workspace, 'umoloda/fetched_articles')
    mkdirpSync(fetchedArticlesDir)
    let numbersRegistry = new FileSavedSet<number>(path.join(args.workspace, 'umoloda/fully_fetched_numbers.txt'))
    let articleRegistry = new FolderSavedMap(fetchedArticlesDir)
    let curNumber = args.seed + 1
    while (--curNumber) {
      if (numbersRegistry.has(curNumber)) {
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
      numbersRegistry.add(curNumber)
    }
  } catch (e) {
    console.error(e)
  }
}
