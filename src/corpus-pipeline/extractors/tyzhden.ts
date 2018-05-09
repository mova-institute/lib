import { CorpusDoc } from '../doc_meta'
import { tryParseHtml } from '../../xml/utils.node'
import { normalizeWebParaSafe } from '../../nlp/utils'
import { dayUkmonthCommaYear2date, isDayUkMonthCommaYear, toSortableDate, dayUkmonth2date } from '../../date'
import { matchNth } from '../../lang'
import { textsOf } from './utils'


////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  let root = tryParseHtml(html)
  if (!root) {
    return
  }

  let url = root.evaluateString('string(/html/head/meta[@property="og:url"]/@content)').trim()

  let title = root.evaluateString('string(//h1/text())').trim()

  let datetimeStr = root.evaluateString(
    'string(//div[@id="postView" or contains(@class, "post-body")]'
    + '//div[@class="bf4"]/span[contains(@style, "color:Gray")]/text())')
    .trim()
  if (!isDayUkMonthCommaYear(datetimeStr)) {
    let curYear = matchNth(html, /©2007-(\d{4}) Тиждень\.ua/, 1)
    if (curYear) {
      var dateObj = dayUkmonth2date(datetimeStr)
      dateObj.setFullYear(Number(curYear))
    }
  } else {
    dateObj = dayUkmonthCommaYear2date(datetimeStr)
  }
  let date = dateObj ? toSortableDate(dateObj) : ''

  let author = root.evaluateString(
    'string(//div[@id="postView"]//div[@class="bf4"]//*[contains(@href, "/Author/")]/text())')
  author = normalizeWebParaSafe(author)

  let paragraphs: Array<string> = []
  let jumbo = root.evaluateString(
    'string(//div[@id="postView"]//table[contains(@class, "publication-body")]//div[contains(@class, "bf1")]/text())')
  if (jumbo) {
    paragraphs.push(jumbo)
  }
  const paragraphsXapthTries = [
    '//div[@id="postView"]//div[contains(@class, "bf3")]/p',
    '//div[@id="postBody" or contains(@class, "post-body")]//p',
    '//div[@id="postBody" or contains(@class, "post-body")]//div[contains(@class, "bf3")]//div',
  ]
  // + '|//div[@id="postBody" or contains(@class, "post-body")]//div'
  // + '|//div[@id="postBody" or contains(@class, "post-body")]/h1'
  for (let paragraphsXapth of paragraphsXapthTries) {
    textsOf(root, paragraphsXapth)
      .map(x => normalizeWebParaSafe(x))
      .filter(x => !x.startsWith('Читайте також'))
      .forEach(x => paragraphs.push(x))
    if (paragraphs.length) {
      break
    }
  }

  let isValid = !!paragraphs.length && !!url
    && (paragraphs.length > 1 || author !== 'The Economist')

  if (isValid) {
    return {
      url,
      date,
      title,
      author,
      paragraphs,
      source: 'Тиждень',
    } as CorpusDoc
  }
}
