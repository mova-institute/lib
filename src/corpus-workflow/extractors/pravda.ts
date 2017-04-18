import { tryParseHtml } from '../../xml/utils.node'
import { zerofill } from '../../string_utils'
import { parseIntStrict, last } from '../../lang'
import * as utils from './utils'
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

  let title = utils.ogValue(root, 'title')
  if (!title) {
    console.error(`no title`)
    return
  }

  let urlStr = utils.canonical(root) || utils.ogValue(root, 'url')
  if (!urlStr) {
    console.error(`no url for ${title}`)
    return
  }
  let url = Url.parse(urlStr)

  let isForeign = false
  let description = utils.ogValue(root, 'description')
  isForeign = description && /\(рос\.?\)\s*$/i.test(description)
  if (isForeign) {
    // console.error(`foreign`)
    return
  }

  if (url.hostname.startsWith('www.pravda.com.ua') && url.pathname.startsWith('/news')) {
    let date = getDate(root, '//div[@class="post_news__date"]')
    let paragraphs = utils.normalizedTextsOf(root, '//div[@class="post_news__text"]/p')
    if (!paragraphs.length) {
      paragraphs = utils.normalizedTextsOf(root, '//div[@class="post_news__text"]/div/p')
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

    let paragraphs = utils.normalizedTextsOf(root, '//div[@class="post__text"]/p')
    if (!paragraphs.length) {
      paragraphs = utils.normalizedTextsOf(root, '//article/p')
    }
    if (!paragraphs.length) {
      paragraphs = utils.normalizedTextsOf(root, '//div[@class="post_news__text"]/p')
    }
    if (!paragraphs.length) {
      paragraphs = utils.normalizedTextsOf(root, '//div[@class="text"]/p')
    }
    if (!paragraphs.length) {
      paragraphs = utils.normalizedTextsOf(root, '//div[contains(@class, "text ")]/p')
    }
    if (!paragraphs.length) {
      paragraphs = brbr2paragraphs(root.evaluateElement('//div[@class="post_news__text"]'))
    }
    paragraphs = paragraphs.filter(x => x)
    trimCopyrightish(paragraphs)

    let author = utils.textOf(root, '//div[@class="post_news__author"]')
    if (!author) {
      author = utils.textOf(root, '//div[@class="article"]/div[@class="dt1"]/b[1]')
    }
    if (!author || author === 'Українська правда') {
      author = undefined
    }

    return { title, author, url: url.href, date, paragraphs } as CorpusDoc
  }
}

//------------------------------------------------------------------------------
function getDate(root: AbstractElement, xpath: string) {
  // Неділя, 5 березня 2017, 01:08
  let ret = utils.textOf(root, xpath)
  if (!ret) {
    return
  }
  let [, date] = ret.split(', ')
  let [d, m, y] = date.split(' ')
  d = zerofill(parseIntStrict(d), 2)
  m = utils.GENITIVE_UK_MON_MAP.get(m)
  ret = `${y}-${m}-${d}`

  return ret
}

//------------------------------------------------------------------------------
function brbr2paragraphs(root: AbstractElement) {
  if (!root) {
    return []
  }
  let ret = new Array<string>()
  let nodes = [...root.evaluateNodes('.//text() | .//br')]
  let buf = ''
  for (let node of nodes) {
    if (node.isText()) {
      buf += node.text().trim()
    } else if (node.isElement() && node.asElement().localName() === 'br') {
      buf = buf.trim()
      if (buf) {
        ret.push(buf)
        buf = ''
      }
    }
  }
  buf = buf.trim()
  if (buf) {
    ret.push(buf)
  }

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
