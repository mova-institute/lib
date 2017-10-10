import * as path from 'path'
import { sync as mkdirpSync } from 'mkdirp'
import * as minimist from 'minimist'

import { FsMap } from '../../fs_map'
import { sleep } from '../../lang';
import { fetchText } from './utils'
import { parseHtml } from '../../xml/utils.node'
import { mu } from '../../mu'



interface Args {
  workspace: string
  offset: number
  step: number
  streakLength: number
}

const baseUrl = 'http://wz.lviv.ua'

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
      'lastPage': ['last-page'],
    },
    default: {
      workspace: './vz',
      step: 15,
      offset: 0,
      streakLength: 30,
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    let fetchedArticlesDir = path.join(args.workspace, 'data')
    mkdirpSync(fetchedArticlesDir)
    let articleRegistry = new FsMap(fetchedArticlesDir)

    for (let i = args.offset; ; i += args.step) {
      console.log(`fetching offset ${i} ==========================================`)

      let root = parseHtml(await fetchText(`${baseUrl}/archive?start=${i}`))
      let hrefs = mu(root.evaluateAttributes('//div[@class="blog-article"]//a[@itemprop="url"]/@href'))
        .map(x => x.value().substr(1))
        .toArray()

      if (!hrefs.length) {
        console.error(`End of archive`)
        break
      }

      let savedSomething = false
      for (let href of hrefs) {
        try {
          let filename = `${href}.html`
          if (articleRegistry.has(filename)) {
            continue
          }
          process.stdout.write(`fetching ${filename}`)
          let content = await fetchText(`${baseUrl}/${href}`)
          articleRegistry.set(filename, content)
          process.stdout.write(` ✔\n`)
          savedSomething = true
        } catch (e) {
          console.error(` ✖️`)
          await sleep(3000)
          continue
        }
      }

      if (!savedSomething && args.streakLength > 0 && !args.streakLength--) {
        break
      }
    }
  } catch (e) {
    console.error(e)
  }
}
