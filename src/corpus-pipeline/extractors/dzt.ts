import { CorpusDoc } from '../doc_meta'
import { parseHtml } from '../../xml/utils.node'
import { textOf, textsOf } from './utils'



////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  let root = parseHtml(html)

  let url = textOf(root, '/html/@itemid')
  let date = textOf(root, '//meta[@property="article:published_time"]/@content')
  let title = textOf(root, '//meta[@property="og:title"]/@content')
  let author = textOf(root, '//a[contains(@class, "author_")]/text()')
  let paragraphs = textsOf(root, '//div[contains(@class, "body_gzn")]/p')

  return { url, date, title, author, paragraphs: [...paragraphs] } as CorpusDoc
}
