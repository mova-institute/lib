import { parseHtml } from '../../xml/utils.node'
import { toSortableDate } from '../../date'
import { AbstractElement } from 'xmlapi'
import { textOf } from './utils'



////////////////////////////////////////////////////////////////////////////////
export function* streamDocs(html: string) {
  let root = parseHtml(html)
  let posts = [...root.evaluateElements('//div[contains(@class, "post_wrap")]')]
  // console.log(`---${posts.length}----`)
  for (let postRoot of posts) {
    let title = textOf(postRoot, './/span[contains(@class, "post_id ")]/a/text()')
    title = `повідомлення ${title}`
    let url = textOf(postRoot, './/span[contains(@class, "post_id ")]/a/@href')
    let author = textOf(postRoot, './/span[@class="author vcard"]/a/text()')
    let date = textOf(postRoot, './/abbr[@class="published updated"]/@title')
    date = toSortableDate(new Date(date))
    let paragraphs = getPostParagraphs(
      postRoot.evaluateElement('.//div[contains(@class, "post entry-content")]'))
    // console.log({ title, url, author, date, paragraphs })
    yield { title, url, author, date, paragraphs }
  }
}

//------------------------------------------------------------------------------
function getPostParagraphs(contentRoot: AbstractElement) {
  let ret = new Array<string>()
  let buf = ''
  for (let node of contentRoot.children()) {
    if (node.isElement()) {
      let el = node.asElement()
      let cssClass = el.attribute('class')
      if (['citation', 'blockquote', 'edit'].includes(cssClass)
        || el.attribute('id') === 'attach_wrap') {
        continue
      }
      if (el.localName() === 'br') {
        buf = buf.trim()
        if (buf) {
          ret.push(buf)
          buf = ''
        }
      }
    }
    buf += node.text()
  }
  buf = buf.trim()
  if (buf) {
    ret.push(buf)
  }
  return ret
}
