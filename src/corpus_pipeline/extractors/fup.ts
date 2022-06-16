import { CorpusDoc } from '../doc_meta'
import { parseHtml } from '../../xml/utils.node'
import { dayUkmonthYearTime2date, toSortableDatetime } from '../../date'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { textOf, nameFromLoginAtDomain } from './utils'



export function* streamDocs(html: string) {
  let root = parseHtml(html)
  let posts = root.evaluateElements('//div[@class="message"]').toArray()
  for (let postRoot of posts) {
    let title = textOf(postRoot, './/a[@class="themelink"]').trim()
    let url = textOf(postRoot, './/a[@class="themelink"]/@href')
    let author = textOf(postRoot, './/div[contains(@class, "message-author")]//a/text()')
    author = nameFromLoginAtDomain(author, 'forum.pravda.com.ua')
    let date = textOf(postRoot, './/span[@class="datetimeinfo"]/text()').trim()
    try {
      date = toSortableDatetime(dayUkmonthYearTime2date(date))
    } catch (e) {
      continue
    }
    let postBody = postRoot.evaluateElement('.//div[contains(@class, "msg")]')
    postBody.children()
    let paragraphs = getPostParagraphs(postBody)

    let toyield: CorpusDoc = {
      title,
      url,
      author,
      date,
      paragraphs,
      source: 'Форум УП',
    }
    // console.error(toyield)
    yield toyield
  }
}

const allowedTextElems = ['a', 'b', 'i', 'strike', 'em', 'strong']  // no <s>!
function getPostParagraphs(contentRoot: AbstractElement) {
  let ret = new Array<string>()
  let oldStyleQuotes = false

  let cur = ''
  for (let [child, next] of contentRoot.children().window(2)) {
    if (child.isText()
      || child.isElement() && allowedTextElems.includes(child.asElement().localName())
    ) {
      cur += child.text()
    }

    if (child.isElement() && child.asElement().localName() === 'br' || !next) {
      let toPush = cur
      cur = ''

      if (/\S Написав:\s*$/.test(toPush)) {
        oldStyleQuotes = true
        continue
      }
      if (oldStyleQuotes && /^(> )*\s*-{4,}\s*$/.test(toPush)) {
        continue
      }
      if (/\s*>/.test(toPush)) {
        continue
      }
      if (/^\s*(Редаговано разів|Останнє редагування):/.test(toPush)) {
        continue
      }

      ret.push(toPush)
    }
  }

  return ret.filter(x => x)
}
