import { tryParseHtml } from '../../xml/utils.node'
import { canonical, ogValue, metaProperty, textsOf, brbr2paragraphs } from './utils'
import { CorpusDoc } from '../doc_meta'
import { firstMatch } from '../../string_utils'



////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  let root = tryParseHtml(html)
  if (!root) {
    console.error(`malformed xml`)
    return
  }

  let url = canonical(root)
  let title = ogValue(root, 'title')
  let date = firstMatch(html, /"datePublished":"([\d\-]+)"/, 1)
  let author = metaProperty(root, 'Author')

  let body = root.evaluateElement('//div[@class="body-container"]//div[@class="wsw"]')
  if (!body) {
    return
  }
  let paragraphs = textsOf(body, './p')
  if (!paragraphs.length) {
    paragraphs = brbr2paragraphs(body)
    let junkI = paragraphs.findIndex(x => x.startsWith('Матеріали до теми:'))
    if (junkI !== -1) {
      paragraphs.splice(junkI)
    }
  }

  if ([url, title, date, paragraphs[0]].some(x => !x)) {
    console.error(`===NOT`)
    console.error([url, title, date, author])
  }


  return {
    url,
    title,
    date,
    author,
    paragraphs,
    source: 'Радіо Свобода',
  } as CorpusDoc
}
