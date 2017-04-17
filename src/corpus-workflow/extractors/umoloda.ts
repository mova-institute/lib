import * as nlpUtils from '../../nlp/utils'
import { removeTags } from '../../xml/utils'
import { parseHtml } from '../../xml/utils.node'
import * as capitalize from 'lodash.capitalize'
import { CorpusDoc } from '../doc_meta'
import { ogValue } from './utils'


////////////////////////////////////////////////////////////////////////////////
export function extract(html: string) {
  let root = parseHtml(html)

  let title = root.evaluateString('string(//h1[@class="titleMain"])')
  if (title) {
    title = title.trim()
  }

  let date = ''
  let dateEl = root.evaluateElement('//span[@class="date"]')
  if (dateEl) {
    date = dateEl.text().trim()
  }
  if (date === '01.01.1970') {
    date = ''
  } else {
    date = date.split('.').reverse().join('-')
  }

  let author = betweenTags(html, 'a', 'class="authorName"')
  author = author.split(/\s/).map(x => capitalize(x))/*.reverse()*/.join(' ')

  let contentEl = root.evaluateElement('//p[@class="content"]')
  let content = ''
  if (contentEl && contentEl.text().trim()) {
    content = contentEl && contentEl.serialize()
  } else {
    html = contentEl.parent().serialize()
    let textMatch = html.match(/<p class="content">([\s\S]*<\/p>)/)
    if (textMatch && textMatch[1]) {
      content = textMatch[1]
    }
  }
  content = removeTags(content)
  content = nlpUtils.normalizeCorpusTextString(content)
  let paragraphs = content && content.split(/[\n\r]+/).filter(x => x.trim()) || []

  let url = ogValue(root, 'url').replace(/\/fb$/, '')


  return {
    title,
    url,
    // reference_title: title ? `УМ:${title}` : `УМ`,
    date,
    author,
    paragraphs,
  } as CorpusDoc
}

//------------------------------------------------------------------------------
function paragraphByNewline(text: string) {
  return `<p>${text.replace(/[\n\r]+/g, '</p>\n<p>')}</p>`
}

//------------------------------------------------------------------------------
function matchTag(html: string, tagName: string, includeTags: boolean, attributes = '') {
  let re = new RegExp(String.raw`<${tagName}[^>]*${attributes}[^>]*>([^>]*)</${tagName}>`)
  let match = html.match(re)
  let i = includeTags ? 0 : 1
  if (match && match[i]) {
    return match[i].trim()
  }
  return ''
}

//------------------------------------------------------------------------------
function betweenTags(html: string, tagName: string, attributes = '') {
  return matchTag(html, tagName, false, attributes)
}

//------------------------------------------------------------------------------
function withTags(html: string, tagName: string, attributes = '') {
  return matchTag(html, tagName, true, attributes)
}
