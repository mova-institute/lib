import { FsMap } from '../../fs_map'
import { fetchText } from '../../request'
import { allMatchesArr } from '../../string'

import { sync as mkdirpSync } from 'mkdirp'
import minimist from 'minimist'
import * as _ from 'lodash'

import * as path from 'path'

interface Args {
  workspace: string
  latestNode: number
  oldestNode: number
}

if (require.main === module) {
  const args = minimist<Args>(process.argv.slice(2), {
    alias: {
      lastNode: ['last-node'],
    },
    default: {
      oldestNode: 56850,
      workspace: './zbruc',
    },
  }) as any

  main(args)
}

async function main(args: Args) {
  let latestNode = await getLatestNode()
  console.error(`Latest node is ${latestNode}`)

  try {
    let fetchedArticlesDir = path.join(args.workspace, 'data')
    mkdirpSync(fetchedArticlesDir)
    let articleRegistry = new FsMap(fetchedArticlesDir)

    let min = Math.max(950, args.oldestNode)
    for (let i = latestNode; i > min; --i) {
      if (articleRegistry.has(`${i}.html`)) {
        continue
      }
      console.log(`fetching zbruc node ${i}`)
      let content
      try {
        content = await fetchText(`http://zbruc.eu/node/${i}?theme=zbruc`)
      } catch (e) {
        delete e.error
        console.error(e.statusCode)
        continue
      }
      articleRegistry.set(`${i}.html`, content)
    }
  } catch (e) {
    console.error(e)
  }
}

async function getLatestNode() {
  let indexCOntent = await fetchText(`https://zbruc.eu?theme=zbruc`)
  let nodes = allMatchesArr(indexCOntent, /href="\/node\/(\d+)"/g)
    .map((x) => x[1])
    .map(Number)

  return Math.max(...nodes)
}
