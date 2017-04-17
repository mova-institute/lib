import { CorpusDoc } from '../doc_meta'
import { parseHtml } from '../../xml/utils.node'
import { normalizeCorpusTextString as normalize } from '../../nlp/utils'
import { GENITIVE_UK_MON_MAP } from './utils'



////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  try {
    var root = parseHtml(html)
  } catch (e) {
    return
  }
  let url = root.evaluateString('string(/html/head/link[@rel="canonical"]/@href)').trim()

  let date: string
  let datetimeStr = root.evaluateString('string(//div[@class="node_date"]/text())').trim()
  //  ↑ '20 жовтня, 1998 - 00:00'
  if (datetimeStr) {
    let [, d, m, y] = datetimeStr.match(/^(\d+)\s+([^,]+),\s+(\d{4})/)
    if (d.length === 1) {
      d = '0' + d
    }
    m = GENITIVE_UK_MON_MAP.get(m)
    date = `${y}–${m}–${d}`
  }

  let title = root.evaluateString('string(//meta[@property="og:title"]/@content)').trim()
  title = normalize(title)
  // title = 'Д.: ' + title

  let description = root.evaluateString('string(//meta[@name="description"]/@content)').trim()

  let author = root.evaluateString('string(//div[@class="node_author"]//text())').trim()
  // author = normalize(author)

  let pXpath = '//div[contains(@property, "articlebody")]/p'
    + '|//div[contains(@property, "articlebody")]/center/p'
  let paragraphs = [...root.evaluateElements(pXpath)
    .filter(x => !!x.text().trim())
    .map(x => normalize(x.text()))]

  return { url, date, description, title, author, paragraphs } as CorpusDoc
}
