import * as glob from 'glob'
import { parseXmlFileSync } from '../xml/utils.node'
import { CorpusDoc } from './doc_meta'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { writeFileSyncMkdirp } from '../utils.node'
import { join } from 'path'
import { tokenizeUk, normalizeWebParaSafe } from '../nlp/utils'



export interface SplitRotateTrainingSetsParams {
  inputXmlGlob: string
}

////////////////////////////////////////////////////////////////////////////////
export function splitRotateTrainingSets(params: SplitRotateTrainingSetsParams) {
  let xmlPaths = glob.sync(params.inputXmlGlob)
  for (let xmlPath of xmlPaths) {
    let doc = parseXmlFileSync(xmlPath)
  }
}

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

  normalizeCorpusDoc(doc)

  if (!doc.paragraphs || !doc.paragraphs.length) {
    console.error('missing paragraphs ✖️')
    return
  }
  if (/* args.checkDate && */ !doc.date) {
    console.error(`no date ✖️`)
    return
  }
  if (/* args.checkUkr &&  */!isConsideredUkrainan(doc.paragraphs, analyzer)) {
    console.error(`considered foreign ✖️  ${doc.paragraphs[0].substr(0, 20)} ${doc.url}`)
    return
  }


  writeFileSyncMkdirp(paraPath, JSON.stringify(doc.paragraphs, undefined, 2))

  let meta = { ...doc }
  delete meta.paragraphs
  writeFileSyncMkdirp(metaPath, JSON.stringify(meta, undefined, 2))
}

//------------------------------------------------------------------------------
function normalizeCorpusDoc(doc: CorpusDoc) {
  doc.paragraphs = doc.paragraphs.map(x => normalizeWebParaSafe(x)).filter(x => x)
  doc.title = doc.title && normalizeWebParaSafe(doc.title)
  doc.author = doc.author && normalizeWebParaSafe(doc.author)
  doc.authors = doc.authors && doc.authors.map(x => normalizeWebParaSafe(x))
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
