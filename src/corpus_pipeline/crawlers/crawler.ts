import { FsMap } from '../../fs_map'
import { fetchText } from '../../request'
import { sleep } from '../../lang'
import { allMatchesArr, trimAfterFirst } from '../../string'

import * as chalk from 'chalk'
import he = require('he')

import { resolve, parse, Url } from 'url'

export type StringPredicate = (value: string) => any
export type UrlPredicate = (value: Url) => any

export interface CrawlerConfig {
  delay?: number
  retryTimeout?: number
  numRetries?: number
  isUrlToSave?: UrlPredicate
  isUrlToFollow?: UrlPredicate
  urlPathToFilename?: (path: string) => string
  urlTransformer?: (url: string) => string
  readFromSaved?: boolean
}

export class Crawler {
  private saved: FsMap
  private visited = new Set<string>()
  private failed = new Set<string>()
  private visiting = new Set<string>()

  private isUrlToSave: UrlPredicate
  private isUrlToFollow: Array<UrlPredicate>

  private urlPathToFilename = (x: string) => x
  private urlTransformer = (x: string) => x

  private delay = 3000
  private numRetries = 5
  private tryTimeout = 2000
  private retryTimeout = 500

  private readFromSaved = true

  constructor(saveDir: string, config?: CrawlerConfig) {
    this.saved = new FsMap(saveDir)
    if (config) {
      if (config.numRetries !== undefined) {
        this.numRetries = config.numRetries
      }
      if (config.delay !== undefined) {
        this.delay = config.delay
      }
      if (config.retryTimeout !== undefined) {
        this.retryTimeout = config.retryTimeout
      }
      if (config.readFromSaved !== undefined) {
        this.readFromSaved = config.readFromSaved
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
    this.delay = value
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

  async seed(urlStr: string) {
    let url = parse(urlStr)
    if (
      this.visited.has(url.href) ||
      this.visiting.has(url.href) ||
      this.failed.has(url.href)
    ) {
      return
    }

    this.visiting.add(url.href)

    let content: string
    let fileishUrl = this.fileizeUrl(url)
    if (this.isUrlToSave(url) && this.saved.has(fileishUrl)) {
      // console.error(` exists ${url.href}`)
      if (!this.readFromSaved) {
        return
      }
      content = this.saved.get(fileishUrl)
    } else {
      process.stderr.write(`${url.href} `)
      try {
        content = await this.fetchContent(url.href)
      } catch (e) {
        console.error(`error fetching ${url.href}  ✖️`)
        // console.error(e.message.substr(0, 80))
        return
      }

      if (!content) {
        // exec(`say 'auch!' -v Karen`)
        process.stderr.write(`✖️\n`)
        this.failed.add(url.href)
        return
      }

      if (this.isUrlToSave(url)) {
        try {
          this.saved.set(fileishUrl, content)
        } catch (e) {
          if (e.code === 'ENAMETOOLONG') {
            console.error(`Name too long, not writing`)
            return
          }
          throw e
        }
        process.stderr.write(`✔\n`)
      } else {
        process.stderr.write(chalk.default.bold(`+\n`))
      }
    }

    let { urlsToSave, urlsToFollow } = this.extractHrefs(url.href, content)

    for (let { href } of urlsToSave) {
      await this.seed(href)
    }
    for (let { href } of urlsToFollow) {
      await this.seed(href)
    }

    this.visited.add(url.href)
    // console.log(`${chalk.default.bold('done')}       ${url.href}`)
  }

  async seedAll(urlStrs: Iterable<string>) {
    for (let urlStr of urlStrs) {
      await this.seed(urlStr)
    }
  }

  private extractHrefs(curHref: string, content: string) {
    let urls = extractHrefs(content)
      .map(this.urlTransformer)
      .map((x) => parse(resolve(curHref, x)))

    let urlsToSave = urls.filter((x) => x && this.isUrlToSave(x))
    let urlsToFollow = urls
      .filter((x) => x && this.isUrlToFollow.some((xx) => xx(x)))
      .sort(
        (a, b) =>
          this.isUrlToFollow.findIndex((x) => x(a)) -
            this.isUrlToFollow.findIndex((x) => x(b)) ||
          (a > b ? 1 : a === b ? 0 : -1),
      )

    return { urlsToSave, urlsToFollow }
  }

  private async fetchContent(href: string) {
    await sleep(this.delay / 2 + Math.random() * this.delay)
    process.stderr.write(' ')
    for (let i = 0; !ret && i <= this.numRetries; ++i) {
      let timeout = i ? this.retryTimeout : this.tryTimeout
      var ret = await Promise.race([this.fetch(href), sleep(timeout)])
      if (!ret) {
        process.stderr.write(chalk.default.bold(`×`))
        await sleep(500)
      }
    }

    return ret
  }

  private fileizeUrl(url: Url) {
    let ret = `${url.hostname}${this.urlPathToFilename(url.path)}`
    if (!ret.endsWith('.html')) {
      ret = ret.endsWith('/') ? `${ret}index.html` : `${ret}.html`
    }

    return ret
  }

  private fetch(href: string) {
    return fetchText(href, {
      jar: true,
    })
  }
}

function extractHrefs(html: string) {
  return allMatchesArr(html, /<\s*a\b[^>]+\bhref="([^"]+)"/g)
    .map((x) => he.unescape(x[1]))
    .map((x) => trimAfterFirst(x, '#'))
    .filter((x) => x.startsWith('http') || !/^\w+:/.test(x))
}
