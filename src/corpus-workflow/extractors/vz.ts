import { tryParseHtml } from '../../xml/utils.node'
import { canonical, ogValue, metaProperty, textOf, textsOf } from './utils'
import { CorpusDoc } from '../doc_meta'



////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  let root = tryParseHtml(html)
  if (!root) {
    console.error(`malformed xml`)
    return
  }

  let url = canonical(root)
  let title = ogValue(root, 'title')
  let date = metaProperty(root, 'article:published_time').substr(0, 10)
  let author =
    textOf(root, '//li[@class="createdby" and @itemprop="author"]/span[@class="name" or @itemprop="name"]')
    || textOf(root, '//div[@class="media"]//h4[@class="media-heading"]/a')
  let paragraphs = textsOf(root, '//div[@class="article-text"]//p')

  if ([url, title, date].some(x => !x)) {
    console.error(`===NOT`)
    console.error([url, title, date, author])
  }

  return { url, title, date, author, paragraphs } as CorpusDoc
}
