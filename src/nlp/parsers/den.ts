import { DocCreator } from 'xmlapi'
import { normalizeCorpusTextString as normalize } from '../../nlp/utils'



const monthMap = new Map([
  ['січня', '01'],
  ['лютого', '02'],
  ['березня', '03'],
  ['квітня', '04'],
  ['травня', '05'],
  ['червня', '06'],
  ['липня', '07'],
  ['серпня', '08'],
  ['вересня', '09'],
  ['жовтня', '10'],
  ['листопада', '11'],
  ['грудня', '12'],
])

////////////////////////////////////////////////////////////////////////////////
export function parseDenArticle(html: string, htmlDocCreator: DocCreator) {
  let valid = true
  let root = htmlDocCreator(html).root()

  let url = root.evaluateString('string(/html/head/link[@rel="canonical"]/@href)').trim()

  let datetimeStr = root.evaluateString('string(//div[@class="node_date"]/text())').trim()
  //  ↑ '20 жовтня, 1998 - 00:00'
  let [, d, m, y] = datetimeStr.match(/^(\d+)\s+([^,]+),\s+(\d{4})/)
  if (d.length === 1) {
    d = '0' + d
  }
  m = monthMap.get(m)
  let date = `${y}–${m}–${d}`

  let title = root.evaluateString('string(//meta[@property="og:title"]/@content)').trim()
  title = normalize(title)
  title = 'Д.: ' + title

  let description = root.evaluateString('string(//meta[@name="description"]/@content)').trim()

  let author = root.evaluateString('string(//div[@class="node_author"]//text())').trim()
  // author = normalize(author)

  let pXpath = '//div[contains(@property, "articlebody")]/p'
    + '|//div[contains(@property, "articlebody")]/center/p'
  let paragraphs = [...root.evaluateElements(pXpath)
    .filter(x => !!x.text().trim())
    .map(x => normalize(x.text()))]

  if (!paragraphs.length) {
    valid = false
  }

  return { valid, url, date, description, title, author, paragraphs }
}
