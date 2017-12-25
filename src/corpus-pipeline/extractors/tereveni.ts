import { CorpusDoc } from '../doc_meta'
import { parseHtml } from '../../xml/utils.node'
import { traverseDepth } from '../../xml/utils'
import { toSortableDate } from '../../date'
import { AbstractElement } from 'xmlapi'
import { textOf } from './utils'



////////////////////////////////////////////////////////////////////////////////
export function* streamDocs(html: string) {
  let root = parseHtml(html)
  let posts = [...root.evaluateElements('//div[contains(@class, "post_wrap")]')]
  // console.log(`---${posts.length}----`)
  for (let postRoot of posts) {
    let title = textOf(postRoot, './/span[contains(@class, "post_id ")]/a/text()').trim()
    title = `повідомлення ${title}`
    let url = textOf(postRoot, './/span[contains(@class, "post_id ")]/a/@href')
    let author = textOf(postRoot, './/span[@class="author vcard"]/a/text()')
    author = `${author} @ tereveni.org`
    let date = textOf(postRoot, './/abbr[@class="published updated"]/@title')
    date = toSortableDate(new Date(date))
    let postEntry = postRoot.evaluateElement('.//div[contains(@class, "post entry-content")]')
    let paragraphs = getPostParagraphs(postEntry)

    let toyield = {
      title,
      url,
      author,
      date,
      paragraphs,
      source: 'Теревені',
    } as CorpusDoc
    yield toyield
  }
}

//------------------------------------------------------------------------------
function getPostParagraphs(contentRoot: AbstractElement) {
  let ret = new Array<string>()
  let buf = ''

  const push = () => {
    buf = buf.trim()
    if (buf) {
      if (!/\bquote\b/.test(buf)) {
        ret.push(buf)
      }
      buf = ''
    }
  }

  traverseDepth(contentRoot, node => {
    if (node.isElement()) {
      let el = node.asElement()
      let cssClass = el.attribute('class')
      if (['citation', 'blockquote', 'edit'].includes(cssClass)
        || el.attribute('id') === 'attach_wrap') {
        return 'skip'
      }
      if (el.localName() === 'br') {
        push()
        return
      } else if (el.localName() === 'img' && el.attribute('class') === 'bbc_emoticon') {
        let alt = el.attribute('alt')
        if (alt) {
          buf += alt
        }
        return
      }
    } else if (node.isText()) {
      buf += node.text()
    }
  })

  push()
  return ret
}
