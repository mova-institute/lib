////////////////////////////////////////////////////////////////////////////////
export function* streamDocs(wikiExtractorFileStr: string) {
  // workaround https://github.com/attardi/wikiextractor/issues/53
  wikiExtractorFileStr = wikiExtractorFileStr.replace(/\s*(\(\)|formula_\d+)/g, '')
  let rawDocs = wikiExtractorFileStr.split('</doc>\n<doc ')
  for (let rawDoc of rawDocs) {
    let match = rawDoc.match(/^(?:<doc )?id="[^"]+" url="([^"]+)" title="([^"]+)">([\s\S]*)(?:<\/doc>)?/)
    // console.log(rawDoc)
    if (!match) {
      console.error(rawDoc)
      continue
    }
    let [, url, title, content] = match
    if (content) {
      let paragraphs = content.trim().split(/\n{2,}/).map(x => x.trim())
      yield { url, title, paragraphs }
    } else {
      console.error(`no content for "${title}"`)
      // console.error(match)
    }
  }
}
