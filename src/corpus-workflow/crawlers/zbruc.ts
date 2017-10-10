import * as path from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as minimist from 'minimist'

import { FsMap } from '../../fs_map'
import { fetchText } from './utils'



interface Args {
  workspace: string
  latestNode: number
  oldestNode: number
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'lastNode': ['last-node'],
    },
    default: {
      oldestNode: 56850,
      workspace: './zbruc'
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    let fetchedArticlesDir = path.join(args.workspace, 'data')
    mkdirpSync(fetchedArticlesDir)
    let articleRegistry = new FsMap(fetchedArticlesDir)

    for (let i = Math.max(950, args.oldestNode); i <= args.latestNode; ++i) {
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
