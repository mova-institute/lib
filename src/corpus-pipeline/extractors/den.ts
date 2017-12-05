import { CorpusDoc } from '../doc_meta'
import { parseHtml } from '../../xml/utils.node'
// import { normalizeCorpusTextString as normalize } from '../../nlp/utils'
import { GENITIVE_UK_MON_MAP, textOf, textsOf } from './utils'



////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  try {
    var root = parseHtml(html)
  } catch (e) {
    return
  }
  let url = textOf(root, '/html/head/link[@rel="canonical"]/@href')

  let date: string
  let datetimeStr = textOf(root, '//div[@class="node_date"]/text()').trim()
  //  ↑ '20 жовтня, 1998 - 00:00'
  if (datetimeStr) {
    let [, d, m, y] = datetimeStr.match(/^(\d+)\s+([^,]+),\s+(\d{4})/)
    if (d.length === 1) {
      d = '0' + d
    }
    m = GENITIVE_UK_MON_MAP.get(m)
    date = `${y}–${m}–${d}`
  }

  let title = textOf(root, '//meta[@property="og:title"]/@content')

  let description = textOf(root, '//meta[@name="description"]/@content')

  let author = textOf(root, '//div[@class="node_author"]//text()')

  let pXpath = '//div[contains(@property, "articlebody")]/p'
    + '|//div[contains(@property, "articlebody")]/center/p'
  let paragraphs = textsOf(root, pXpath)

  return { url, date, description, title, author, paragraphs } as CorpusDoc
}
