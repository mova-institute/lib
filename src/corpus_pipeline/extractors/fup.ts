import { CorpusDoc } from '../doc_meta'
import { parseHtml } from '../../xml/utils.node'
import { dayUkmonthYearTime2date, toSortableDatetime } from '../../date'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { textOf, nameFromLoginAtDomain } from './utils'



////////////////////////////////////////////////////////////////////////////////
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

//------------------------------------------------------------------------------
const allowedTextElems = ['a', 'b', 'i', 'strike', 'emph']
//------------------------------------------------------------------------------
function getPostParagraphs(contentRoot: AbstractElement) {
  let ret = ['']
  let oldStyleQuotes = false

  for (let child of contentRoot.children()) {
    if (child.isText()
      || child.isElement() && allowedTextElems.includes(child.asElement().localName())
    ) {
      let text = child.text()
      if (/^\S+ Написав:\s*$/.test(text)) {
        oldStyleQuotes = true
        continue
      }
      if (oldStyleQuotes && /^\s*-{4,}\s*$/.test(text)) {
        continue
      }
      if (/\s*>/.test(text)) {
        continue
      }

      ret[ret.length - 1] += text
    }
    if (child.isElement() && child.asElement().localName() === 'br') {
      ret.push('')
    }
  }

  return ret.filter(x => x)
}
