import { CorpusDoc } from './doc_meta'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { writeFileSyncMkdirp } from '../utils.node'
import { join } from 'path'
import { tokenizeUk, normalizeZvidusilParaNondestructive } from '../nlp/utils'
import { Dict } from '../types'
import { getDomain } from 'tldjs'



////////////////////////////////////////////////////////////////////////////////
export function processDoc(
  // args: Args,
  doc: CorpusDoc,
  outDir: string,
  relpath: string,
  analyzer?: MorphAnalyzer,
) {
  let [metaPath, paraPath] = getMetaParaPaths(outDir, relpath)

  if (!doc) {
    console.error('no doc ✖️')
    return
  }

  normalizeDocNondestructive(doc)

  if (!doc.paragraphs || !doc.paragraphs.length) {
    console.error('missing paragraphs ✖️')
    return
  }
  if (/* args.checkDate && */ !doc.date) {
    console.error(`no date ✖️`)
    return
  }
  // volatile, in development, deferring to later stages
  // if (/* args.checkUkr &&  */!isConsideredUkrainan(doc.paragraphs, analyzer)) {
  //   console.error(`considered foreign ✖️  ${doc.paragraphs[0].substr(0, 20)} ${doc.url}`)
  //   return
  // }


  writeFileSyncMkdirp(paraPath, JSON.stringify(doc.paragraphs, undefined, 2))

  let meta = { ...doc }
  delete meta.paragraphs
  writeFileSyncMkdirp(metaPath, JSON.stringify(meta, undefined, 2))
}

//------------------------------------------------------------------------------
function normalizeDocNondestructive(doc: CorpusDoc) {
  doc.paragraphs = doc.paragraphs.map(x => normalizeZvidusilParaNondestructive(x)).filter(x => x)
  doc.title = doc.title && normalizeZvidusilParaNondestructive(doc.title)
  doc.author = doc.author && normalizeZvidusilParaNondestructive(doc.author)
  doc.authors = doc.authors && doc.authors.map(x => normalizeZvidusilParaNondestructive(x))
  doc.date = doc.date && doc.date.trim()
}

//------------------------------------------------------------------------------
function isConsideredUkrainan(paragraphs: Array<string>, analyzer: MorphAnalyzer) {
  const THRESHOLD = 0.2

  let tokensChecked = 0
  let numX = 0
  for (let i = paragraphs.length - 1; i >= 0; --i) {
    let tokens = tokenizeUk(paragraphs[i], analyzer)
    numX += tokens.filter(({ token }) => !analyzer.tag(token).filter(x => !x.isX()).length)
      .length
    tokensChecked += tokens.length
    if (tokensChecked >= 30) {
      return numX / tokensChecked < THRESHOLD
    }
  }

  if (tokensChecked) {
    if (tokensChecked < 6) {
      if (paragraphs.some(p => /їєґі/.test(p))) {
        return true
      }
      if (paragraphs.some(p => /ыэёъ/.test(p))) {
        return false
      }
    }
    return numX / tokensChecked < THRESHOLD
  }
}

//------------------------------------------------------------------------------
export function getMetaParaPaths(outDir: string, relpath: string) {
  return [join(outDir, 'meta', `${relpath}.json`), join(outDir, 'para', `${relpath}.json`)]
}

////////////////////////////////////////////////////////////////////////////////
export function prepareZvidusilMeta(value: Dict<string>) {
  if (value.url) {
    value.tld = getDomain(value.url)
  }
}
