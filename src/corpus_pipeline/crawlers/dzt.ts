import * as path from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import minimist from 'minimist'

import { FileSavedSet } from '../../file_saved_set.node'
import { FsMap } from '../../fs_map'
import { fetchText } from '../../request'
import { parseHtml } from '../../xml/utils.node'



interface Args {
  workspace: string
  lastNumber: number
}

const baseHref = 'http://gazeta.dt.ua/'

if (require.main === module) {
  const args = minimist<Args>(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
      'lastNumber': ['last-number'],
    },
    default: {
      lastNumber: 1076,
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    let fetchedArticlesDir = path.join(args.workspace, 'dzt/fetched_articles')
    mkdirpSync(fetchedArticlesDir)

    let numbersRegistry = new FileSavedSet<number>(path.join(args.workspace, 'dzt/fully_fetched_numbers.txt'))
    let articleRegistry = new FsMap(fetchedArticlesDir)

    for (let i = 293; i <= args.lastNumber; ++i) {
      if (numbersRegistry.has(i)) {
        continue
      }
      console.log(`processing №${i}`)

      let indexContent = await fetchText(`http://gazeta.dt.ua/archives/${i}`)
      let root = parseHtml(indexContent)
      let hrefs = root.evaluateAttributes('//div[contains(@class, "articles")]/a/@href')
        .map(x => x.value())
        .filter(x => x.startsWith(baseHref))
        .map(x => x.substr(baseHref.length))
        .filter(x => !articleRegistry.has(x))

      for (let articleHref of hrefs) {
        console.log(`processing ${articleHref}`)
        let content = await fetchText(baseHref + articleHref)
        articleRegistry.set(articleHref, content)
      }

      numbersRegistry.add(i)
    }
  } catch (e) {
    console.error(e)
  }
}
