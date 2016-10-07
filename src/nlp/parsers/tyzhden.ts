import { DocCreator } from 'xmlapi'
import { normalizeCorpusTextString as normalize } from '../../nlp/utils'
import { dayUkmonthCommaYear2date, isDayUkMonthCommaYear, toSortableDate, dayUkmonth2date } from '../../date'
import { matchNth } from '../../lang'


////////////////////////////////////////////////////////////////////////////////
export function parseTyzhdenArticle(html: string, htmlDocCreator: DocCreator) {
  let root = htmlDocCreator(html).root()

  let url = root.evaluateString('string(/html/head/meta[@property="og:url"]/@content)').trim()

  let title = root.evaluateString('string(//h1/text())').trim()
  title = normalize(title)

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
  author = normalize(author)

  let paragraphs: string[] = []
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
    root.evaluateElements(paragraphsXapth)
      .map(x => normalize(x.text()).trim())
      .filter(x => x && !x.startsWith('Читайте також'))
      .forEach(x => paragraphs.push(x))
    if (paragraphs.length) {
      break
    }
  }

  let isValid = !!paragraphs.length && !!url
    && (paragraphs.length > 1 || author !== 'The Economist')

  return { isValid, url, date, title, author, paragraphs }
}
