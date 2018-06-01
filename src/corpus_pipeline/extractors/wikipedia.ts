import { CorpusDoc } from '../doc_meta'



////////////////////////////////////////////////////////////////////////////////
export function* streamDocs(wikiExtractorFileStr: string) {
  for (let line of wikiExtractorFileStr.trim().split('\n')) {
    let { url, text, title } = JSON.parse(line)
    // workaround https://github.com/attardi/wikiextractor/issues/53
    text = text.replace(/\s*(\(\)|\([,;][^)]*\)|formula_\d+)/g, '').trim()
    if (text) {
      let paragraphs = text.split(/\n{2,}/).map(x => x.replace(/\n+/g, ' '))
      yield {
        url,
        title,
        paragraphs,
        source: 'Вікіпедія',
      } as CorpusDoc
    } else {
      console.error(`no content for "${title}"`)
    }
  }
}
