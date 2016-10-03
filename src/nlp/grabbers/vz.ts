import * as path from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as minimist from 'minimist'

import { FolderSavedMap } from '../../folder_saved_map.node'
import { FileSavedSet } from '../../file_saved_set.node'
import { matchAll, sleep } from '../../lang';
import { fetchText, parseHtml } from './utils'



interface Args {
  workspace: string
  lastPage: number
}

const baseUrl = 'http://wz.lviv.ua'

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
      'lastPage': ['last-page'],
    },
    default: {
      lastPage: 134670,
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    let fetchedArticlesDir = path.join(args.workspace, 'vz/fetched_articles')
    mkdirpSync(fetchedArticlesDir)
    let indexesRegistry = new FileSavedSet<number>(
      path.join(args.workspace, 'vz/fully_fetched_indexes.txt'))
    let articleRegistry = new FolderSavedMap(fetchedArticlesDir, '**/*.html')

    for (let i = 0; i <= args.lastPage; ++i) {
      if (indexesRegistry.has(i)) {
        continue
      }
      console.log(`fetching index ${i}`)

      let root = parseHtml(await fetchText(`${baseUrl}/archive?start=${i * 10}`))
      let hrefs = root.evaluateAttributes('//div[@class="blog-article"]//a[@itemprop="url"]/@href')
        .map(x => x.value().substr(1))

      let errorOccured = false
      for (let href of hrefs) {
        try {
          let filename = `${href}.html`
          if (articleRegistry.has(filename)) {
            continue
          }
          console.log(`fetching ${filename}`)
          let content = await fetchText(`${baseUrl}/${href}`)
          articleRegistry.set(filename, content)
        } catch (e) {
          errorOccured = true
          console.error()
          await sleep(3000)
          continue
        }
      }
      if (!errorOccured) {
        indexesRegistry.add(i)
      }
    }
  } catch (e) {
    console.error(e)
  }
}
