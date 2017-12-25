import { tryParseHtml } from '../../xml/utils.node'
import { zerofill } from '../../string_utils'
import { parseIntStrict, last } from '../../lang'
import { mu } from '../../mu'
import {
  textOf, textsOf, ogValue, canonical,
  GENITIVE_UK_MON_MAP, brbr2paragraphs,
} from './utils'
import { CorpusDoc } from '../doc_meta'

import * as Url from 'url'
import { AbstractElement } from 'xmlapi'



////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  let root = tryParseHtml(html)
  if (!root) {
    console.error(`malformed xml`)
    return
  }

  let title = ogValue(root, 'title')
  if (!title) {
    console.error(`no title`)
    return
  }

  let urlStr = canonical(root) || ogValue(root, 'url')
  if (!urlStr) {
    console.error(`no url for ${title}`)
    return
  }
  let url = Url.parse(urlStr)

  let isForeign = false
  let description = ogValue(root, 'description')
  isForeign = description && /\(рос\.?\)\s*$/i.test(description)
  if (isForeign) {
    // console.error(`foreign`)
    return
  }

  if (url.hostname.startsWith('www.pravda.com.ua') && url.pathname.startsWith('/news')) {
    let date = getDate(root, '//div[@class="post_news__date"]')
    let paragraphs = textsOf(root, '//div[@class="post_news__text"]/p')
    if (!paragraphs.length) {
      paragraphs = textsOf(root, '//div[@class="post_news__text"]/div/p')
    }
    if (!paragraphs.length) {
      paragraphs = brbr2paragraphs(root.evaluateElement('//div[@class="post_news__text"]'))
    }

    trimCopyrightish(paragraphs)
    return { title, date, url: url.href, paragraphs }
  } else {
    let date = getDate(root, '//div[@class="post_news__date"]')
    if (!date) {
      date = getDate(root, '//div[@class="post__time"]')
    }
    if (!date) {
      let match = url.pathname.match(/^\/\w+\/(\d{4})\/(\d{1,2})\/(\d{1,2})/)
      if (match) {
        let [, y, m, d] = match
        date = `${y}-${m}-${d}`
      }
    }
    let paragraphs = mu([
      '//div[@class="post__text"]/p',
      '//article/p',
      '//div[@class="post_news__text"]/p',
      '//div[@class="text"]/p',
      '//div[contains(@class, "text ")]/p',
    ]).map(x => textsOf(root, x)).find(x => x.length)

    if (!paragraphs) {
      paragraphs = brbr2paragraphs(root.evaluateElement('//div[@class="post_news__text"]'))
    }
    paragraphs = paragraphs.filter(x => x)
    trimCopyrightish(paragraphs)

    let author = textOf(root, '//div[@class="post_news__author"]')
    if (!author) {
      author = textOf(root, '//div[@class="article"]/div[@class="dt1"]/b[1]')
    }
    if (!author || author === 'Українська правда') {
      author = undefined
    }

    return {
      title,
      author,
      url: url.href,
      date,
      paragraphs,
      source: 'Українська правда',
    } as CorpusDoc
  }
}

//------------------------------------------------------------------------------
function getDate(root: AbstractElement, xpath: string) {
  // Неділя, 5 березня 2017, 01:08
  let ret = textOf(root, xpath)
  if (!ret) {
    return
  }
  let [, date] = ret.split(', ')
  let [d, m, y] = date.split(' ')
  d = zerofill(parseIntStrict(d), 2)
  m = GENITIVE_UK_MON_MAP.get(m)
  ret = `${y}-${m}-${d}`

  return ret
}


//------------------------------------------------------------------------------
function trimCopyrightish(paragraphs: string[]) {
  if (paragraphs.length) {
    if (/( правда$|^\S+$|^Теми: |для УП$)/i.test(last(paragraphs))) {
      return paragraphs.pop()
    }
  }
}
