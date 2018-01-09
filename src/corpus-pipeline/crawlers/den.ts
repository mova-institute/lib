import { sleep } from '../../lang'
import { fetchText } from '../../request_utils'
import { matchAll } from '../../string_utils'

import * as minimist from 'minimist'

import * as path from 'path'
import * as fs from 'fs'
import { sync as mkdirpSync } from 'mkdirp'



interface Args {
  saveDir: string
  workspace: string
  seed: number
}

type LinkExtractor = (html: string) => string[]
class Crawler {
  private visited = new Set<string>()//: FileSavedSet<string>
  private visiting = new Set<string>()
  private saveLinkExtractor: LinkExtractor
  private followLinkExtractor: LinkExtractor

  constructor(visitedRegistryFilename: string) {
    // this.visited = new FileSavedSet(visitedRegistryFilename)
  }

  setSaveLinkExtractor(extractor: LinkExtractor) {
    this.saveLinkExtractor = extractor
    return this
  }

  setFollowLinkExtractor(extractor: LinkExtractor) {
    this.followLinkExtractor = extractor
    return this
  }

  async seed(url: string, onSave?: (url: string, content: string) => void) {
    if (this.visited.has(url) || this.visiting.has(url)) {
      return
    }
    this.visiting.add(url)

    console.log(`seeding ${url}`)
    // await sleep(100)
    let content = await fetchText(url)
    for (let link of this.saveLinkExtractor(content)) {
      let saveTo = link.match(articleSavePath)[1]
      saveTo = path.join('saved_web/day.kyiv.ua', saveTo) + '.html'
      if (fs.existsSync(saveTo)) {
        // console.log(`skipping ${saveTo}`)
      } else {
        console.log(`saving to ${saveTo}`)
        mkdirpSync(path.dirname(saveTo))
        fs.writeFileSync(saveTo, await fetchText(link), 'utf8')
      }

      // onSave(link, await fetchText(link))
      this.visited.add(link)
    }
    for (let link of this.followLinkExtractor(content)) {
      await this.seed(link, onSave)
    }
    this.visited.add(url)
  }
}


const basUrl = 'http://day.kyiv.ua'
const monthIndexHrefRe = new RegExp(String.raw`uk/archivenewspaper?archive_date[value][month]=\d+.*[year]=\d{4}(&page=\d+)?`, 'g')
const numberIndexHrefRe = new RegExp(String.raw`"(/uk/arhiv/no[\d\-]+(\?page=\d+)?)"`, 'g')
const articleHrefRe = new RegExp(String.raw`"(/uk/article/[^"]+)"`, 'g')
const articleSavePath = new RegExp(String.raw`/uk/article/(.+)`)

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    default: {
      workspace: 'den',
      saveDir: 'saved_web/day.kyiv.ua',
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    mkdirpSync(args.saveDir)

    let crawler = new Crawler(path.join(args.workspace, 'fully_fetched_urls.txt'))
      .setSaveLinkExtractor(content => {
        return matchAll(content, articleHrefRe).map(x => basUrl + x[1])
      })
      .setFollowLinkExtractor(content => {
        let ret = matchAll(content, monthIndexHrefRe).map(x => x[0])
        ret.push(...matchAll(content, numberIndexHrefRe).map(x => x[1]))
        ret = ret.map(x => basUrl + x)
        return ret
      })

    let monthCrist = 1998 * 12 + 1
    let now = new Date()
    let monthNow = now.getFullYear() * 12 + now.getMonth()

    for (; monthCrist <= monthNow; ++monthCrist) {
      let month = monthCrist % 12
      let year = Math.floor(monthCrist / 12)
      let seedUrl = `http://day.kyiv.ua/uk/archivenewspaper?archive_date%5Bvalue%5D%5Bmonth%5D=${month}`
        + `&archive_date%5Bvalue%5D%5Byear%5D=${year}`
      try {
        await crawler.seed(seedUrl)
      } catch (e) {
        if (e.code === 'Z_BUF_ERROR') {
          console.error(e)
          await sleep(10000)
          continue
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
}
