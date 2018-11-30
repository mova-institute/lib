import { FsMap } from '../../fs_map'
import { fetchText } from '../../request'
import { sleep } from '../../lang'
import { allMatchesArr, trimAfterFirst } from '../../string'

import * as chalk from 'chalk'

import { resolve, parse, Url } from 'url'
import he = require('he')



////////////////////////////////////////////////////////////////////////////////
export type StringPredicate = (value: string) => any
export type UrlPredicate = (value: Url) => any

////////////////////////////////////////////////////////////////////////////////
export interface CrawlerConfig {
  timeout?: number
  isUrlToSave: UrlPredicate
  isUrlToFollow: UrlPredicate
  urlPathToFilename?: (path: string) => string
  urlTransformer?: (url: string) => string
}

////////////////////////////////////////////////////////////////////////////////
export class Crawler {
  private saved: FsMap
  private visited = new Set<string>()
  private failed = new Set<string>()
  private visiting = new Set<string>()

  private isUrlToSave: UrlPredicate
  private isUrlToFollow: Array<UrlPredicate>

  private urlPathToFilename = (x: string) => x
  private urlTransformer = (x: string) => x

  private timeout = 0
  private numRetries = 5

  constructor(saveDir: string, config?: CrawlerConfig) {
    this.saved = new FsMap(saveDir)
    if (config) {
      if (config.timeout !== undefined) {
        this.timeout = config.timeout
      }
      if (config.isUrlToSave) {
        this.isUrlToSave = config.isUrlToSave
      }
      if (config.isUrlToFollow) {
        this.isUrlToFollow = [config.isUrlToFollow]
      }
      if (config.urlPathToFilename) {
        this.urlPathToFilename = config.urlPathToFilename
      }
      if (config.urlTransformer) {
        this.urlTransformer = config.urlTransformer
      }
    }
  }

  setTimeout(value: number) {
    this.timeout = value
    return this
  }

  setUrlsToSave(pred: UrlPredicate) {
    this.isUrlToSave = pred
    return this
  }

  setUrlsToFollow(pred: Array<UrlPredicate>) {
    this.isUrlToFollow = pred
    return this
  }

  async seed(urlStrs: Array<string>) {
    for (let urlStr of urlStrs) {
      let url = parse(urlStr)
      let fileishUrl = `${url.hostname}${this.urlPathToFilename(url.path)}`
      if (!fileishUrl.endsWith('.html')) {
        fileishUrl = fileishUrl.endsWith('/') ? `${fileishUrl}index.html` : `${fileishUrl}.html`
      }
      if (this.visited.has(url.href)
        || this.visiting.has(url.href)
        || this.saved.has(fileishUrl)
        || this.failed.has(url.href)
      ) {
        return
      }
      this.visiting.add(url.href)

      process.stderr.write(`processing ${url.href} `)
      let content: string
      if (this.isUrlToSave(url) && this.saved.has(fileishUrl)) {
        process.stderr.write(` exists\n`)
      } else {
        try {
          await sleep(this.timeout / 2 + Math.random() * this.timeout)
          process.stderr.write(' ')
          for (let i = 0; !content && i < this.numRetries; ++i) {
            content = await Promise.race([this.fetch(url.href), sleep(2000)])
            if (!content)  {
              process.stderr.write(chalk.default.bold(`×`))
              await sleep(500)
            }
          }
          if (!content) {
            // exec(`say 'auch!' -v Karen`)
            process.stderr.write(`✖️\n`)
            this.failed.add(url.href)
            return
          }
        } catch (e) {
          console.error(`error fetching ${url.href}`)
          console.error(e.message.substr(0, 80))
          return
        }

        if (url && this.isUrlToSave(url)) {
          try {
            this.saved.set(fileishUrl, content)
          } catch (e) {
            if (e.code === 'ENAMETOOLONG') {
              console.error(`Name too long, not writing`)
              continue
            }
            throw e
          }
          process.stderr.write(`✔\n`)
        } else {
          process.stderr.write(chalk.default.bold(`+\n`))
        }
      }

      let urls = extractHrefs(content)
        .map(this.urlTransformer)
        .map(x => parse(resolve(url.href, x)))

      let urlsToSave = urls.filter(x => x && this.isUrlToSave(x))
      let urlsToFollow = urls.filter(x => x && this.isUrlToFollow.some(xx => xx(x)))
        .sort((a, b) =>
          (this.isUrlToFollow.findIndex(x => x(a)) - this.isUrlToFollow.findIndex(x => x(b)))
          || (a > b ? 1 : (a === b ? 0 : -1))
        )

      for (let { href } of urlsToSave) {
        await this.seed([href])
      }
      for (let { href } of urlsToFollow) {
        await this.seed([href])
      }

      this.visited.add(url.href)
      // console.log(`fully processed ${url.href}`)
    }
  }

  private fetch(href: string) {
    return fetchText(href, {
      jar: true,
    })
  }
}

//------------------------------------------------------------------------------
function extractHrefs(html: string) {
  return allMatchesArr(html, /<\s*a\b[^>]+\bhref="([^"]+)"/g)
    .map(x => he.unescape(x[1]))
    .map(x => trimAfterFirst(x, '#'))
    .filter(x => x.startsWith('http') || !/^\w+:/.test(x))
}
