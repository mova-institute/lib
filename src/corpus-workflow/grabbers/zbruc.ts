import * as path from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as minimist from 'minimist'

import { FolderSavedMap } from '../../folder_saved_map.node'
import { matchAll, sleep } from '../../lang';
import { fetchText } from './utils'
import { parseHtml } from '../../xml/utils.node'



interface Args {
  workspace: string
  lastNode: number
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
      'lastNode': ['last-node'],
    },
    default: {
      lastNode: 56850,
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    let fetchedArticlesDir = path.join(args.workspace, 'zbruc/fetched_articles')
    mkdirpSync(fetchedArticlesDir)
    let articleRegistry = new FolderSavedMap(fetchedArticlesDir, '*.html')

    for (let i = 950; i <= args.lastNode; ++i) {
      if (articleRegistry.has(`${i}.html`)) {
        continue
      }
      console.log(`fetching zbruc node ${i}`)
      let content
      try {
        content = await fetchText(`http://zbruc.eu/node/${i}`)
      } catch (e) {
        console.error(`EXCEPTION ${e.message || ''}`)
        continue
      }
      articleRegistry.set(`${i}.html`, content)
    }
  } catch (e) {
    console.error(e)
  }
}
