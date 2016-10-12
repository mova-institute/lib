import { join } from 'path'
import { FileSavedSet } from '../../file_saved_set.node'
import { FolderSavedMap } from '../../folder_saved_map.node'
import { fetchText, parseHtml } from './utils'
import { matchAll, sleep } from '../../lang'
import { resolve, parse, Url } from 'url'
import { AbstractElement } from 'xmlapi'


// export type LinkExtractor = (html: string) => string[]
export type LinkExtractor = (root: AbstractElement) => string[]
export type StringPredicate = (value: string) => boolean

////////////////////////////////////////////////////////////////////////////////
export class Crawler {
  private saved: FolderSavedMap
  private visited: FileSavedSet<string>
  private visiting = new Set<string>()

  private isUrlToSave: StringPredicate
  private isUrlToFollow: StringPredicate

  private followUrlsExtractor: LinkExtractor
  private saveUrlsExtractor: LinkExtractor

  constructor(workspacePath: string) {
    this.visited = new FileSavedSet(join(workspacePath, 'processed.txt'))
    this.saved = new FolderSavedMap(join(workspacePath, 'html'), '**/*.html')
  }

  setUrlsToSave(pred: StringPredicate) {
    this.isUrlToSave = pred
    return this
  }

  setUrlsToFollow(pred: StringPredicate) {
    this.isUrlToFollow = pred
    return this
  }

  async seed(urlStr: string) {
    let url = parse(urlStr)
    let fileishUrl = url.path.substr(1)
    if (!fileishUrl.endsWith('.html')) {
      fileishUrl = `${fileishUrl}.html`
    }
    if (this.visited.has(urlStr) || this.visiting.has(urlStr) || this.saved.has(fileishUrl)) {
      return
    }
    this.visiting.add(urlStr)

    try {
      var content = await fetchText(urlStr)
    } catch (e) {
      console.error(`error fetching ${urlStr}`)
      return
    }


    if (this.isUrlToSave(url.path.substr(1))) {
      this.saved.set(fileishUrl, content)
      console.log(`saved ${urlStr}`)
    } else {
      console.log(`fetched ${urlStr}`)
    }

    let root = parseHtml(content)
    let hrefToFollow = this.followUrlsExtractor(root)
      .map(x => parse(resolve(urlStr, x)))
      .filter(x => x.hostname === url.hostname)

    // let hrefs = extractHrefs(content)
    //   .map(x => parse(resolve(urlStr, x)))
    //   .filter(x => x.hostname === url.hostname && (!this.isUrlToFollow || this.isUrlToFollow(x.pathname.substr(1))))
    //   .sort(this.urlCompare.bind(this))

    for (let href of hrefToFollow) {
      await this.seed(href.href)
    }

    this.visited.add(urlStr)
    console.log(`fully processed ${urlStr}`)
  }

  private urlCompare(a: Url, b: Url) {
    let aa = this.isUrlToSave(a.pathname.substr(1))
    let bb = this.isUrlToSave(a.pathname.substr(1))

    return Number(bb) - Number(aa)
  }
}

//------------------------------------------------------------------------------
function extractHrefs(html: string) {
  return matchAll(html, /<\s*a\b[^>]+\bhref="([^"]+)"/g)
    .map(x => x[1])
    .filter(x => x.startsWith('http') || !/^\w+:/.test(x))
}
