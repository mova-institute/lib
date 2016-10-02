import * as nlpUtils from '../../nlp/utils'
import { removeTags } from '../../xml/utils'
import { DocCreator } from 'xmlapi'
import { capitalize } from 'lodash'
import { normalizeCorpusTextString as normalize } from '../../nlp/utils'



////////////////////////////////////////////////////////////////////////////////
export function parseDztArticle(html: string, htmlDocCreator: DocCreator) {
  let root = htmlDocCreator(html).root()

  let url = root.evaluateString('string(/html/@itemid)').trim()

  let datetime = root.evaluateString('string(//meta[@property="article:published_time"]/@content)')
    .trim()

  let title = root.evaluateString('string(//meta[@property="og:title"]/@content)').trim()
  title = normalize(title)

  let author = root.evaluateString('string(//a[contains(@class, "author_")]/text())').trim()
  author = normalize(author)

  let paragraphs = root.evaluateElements('//div[contains(@class, "body_gzn")]/p')
    .filter(x => !!x.text().trim())
    .map(x => normalize(x.text()))

  return { url, datetime, title, author, paragraphs: [...paragraphs] }
}
