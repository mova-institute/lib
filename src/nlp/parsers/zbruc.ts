import { DocCreator } from 'xmlapi'
import { normalizeCorpusTextString as normalize } from '../../nlp/utils'
import { allcaps2TitlecaseDirty } from '../../string_utils'
import { toSortableDate } from '../../date'



const baseUrl = 'http://zbruc.eu'

////////////////////////////////////////////////////////////////////////////////
export function parseZbrucArticle(html: string, htmlDocCreator: DocCreator) {
  let root = htmlDocCreator(html).root()

  let url = root.evaluateString('string(/html/head/link[@rel="canonical"]/@href)').trim()
  if (url.startsWith('/')) {
    url = baseUrl + url
  }

  let title = root.evaluateString('string(//meta[@property="og:title"]/@content)').trim()
  title = normalize(title)

  let datetimeStr = root.evaluateString(
    'string(//span[@class="date-display-single" and preceding::div[contains(@property, "content:encoded")]]/@content)')
    .trim()
  let date = datetimeStr && toSortableDate(new Date(datetimeStr)) || ''

  let author = root.evaluateString(
    'string(//div[contains(@class, "field-name-field-author")]//text())').trim()
  if (author) {
    author = normalize(author)
    author = allcaps2TitlecaseDirty(author)
  }

  const paragraphsXapth = '//div[contains(@property, "content:encoded")]/p'
    + '|//div[@class="content"]//div[contains(@class, "field-name-field-depeshi")]//p'
  let paragraphs = [...root.evaluateElements(paragraphsXapth)
    .filter(x => !!x.text().trim())
    .map(x => normalize(x.text()))]

  if (!paragraphs.length) {
    paragraphs = [...root.evaluateElements('//div[contains(@class, "field-item")]//p')
      .filter(x => !!x.text().trim())
      .map(x => normalize(x.text()))]
  }

  let isValid = !!(paragraphs.length && url)

  return { isValid, url, date, title, author, paragraphs }
}
