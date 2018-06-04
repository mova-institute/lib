import { CorpusDoc } from '../doc_meta'
import { tryParseHtml } from '../../xml/utils.node'
import { normalizeZvidusilParaNondestructive } from '../../nlp/utils'
import { allcaps2titlecaseDirty } from '../../string'
import { toSortableDate } from '../../date'
import { textOf, textsOf } from './utils'



const baseUrl = 'http://zbruc.eu'

////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  let root = tryParseHtml(html)
  if (!root) {
    return
  }

  let url = textOf(root, '/html/head/link[@rel="canonical"]/@href').trim()
  if (url.startsWith('/')) {
    url = baseUrl + url
  }

  let title = textOf(root, '//meta[@property="og:title"]/@content')
  // title = normalize(title)

  let datetimeStr = textOf(root, '//span[@class="date-display-single" and preceding::div[contains(@property, "content:encoded")]]/@content')
    .trim()
  let date = datetimeStr && toSortableDate(new Date(datetimeStr)) || ''

  let author = textOf(root, '//div[contains(@class, "field-name-field-author")]//text()').trim()
  if (author) {
    author = normalizeZvidusilParaNondestructive(author)
    author = allcaps2titlecaseDirty(author)
  }

  const paragraphsXapth = '//div[contains(@property, "content:encoded")]/p'
    + '|//div[@class="content"]//div[contains(@class, "field-name-field-depeshi")]//p'
  let paragraphs = textsOf(root, paragraphsXapth)
  if (!paragraphs.length) {
    paragraphs = textsOf(root, '//div[contains(@class, "field-item")]//p')
  }

  if (url) {
    return {
      url,
      date,
      title,
      author,
      paragraphs,
      source: 'Збруч',
    } as CorpusDoc
  }
}
