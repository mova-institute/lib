////////////////////////////////////////////////////////////////////////////////
export function parseUmolodaArticle(html: string) {
  let title = betweenTags(html, 'h1', 'class="titleMain"') || betweenTags(html, 'title')
  let date = betweenTags(html, 'span', 'class="date"')
  let author = betweenTags(html, 'a', 'class="authorName"')
  let content = withTags(html, 'p', 'class="content"')
}

function matchTag(html: string, tagName: string, includeTags: boolean, attributes = '') {
  let re = new RegExp(`<${tagName}[^>]*\s${attributes}>([^>]*)</${tagName}>`)
  let match = html.match(re)
  let i = includeTags ? 0 : 1
  if (match && match[i]) {
    return match[i].trim()
  }
  return ''
}

function betweenTags(html: string, tagName: string, attributes = '') {
  return matchTag(html, tagName, false, attributes)
}

function withTags(html: string, tagName: string, attributes = '') {
  return matchTag(html, tagName, true, attributes)
}
