import { CorpusDoc } from './doc_meta'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { writeFileSyncMkdirp } from '../utils.node'
import { tokenizeUk, normalizeZvidusilParaNondestructive } from '../nlp/utils'
import { getDomain } from 'tldjs'
import { mapInplace } from '../lang'
import { mu } from '../mu'

import shuffle = require('lodash.shuffle')

export function processDoc(
  // args: Args,
  doc: CorpusDoc,
  outPath: string,
  analyzer?: MorphAnalyzer,
) {
  if (!doc) {
    console.error('no doc ✖️')
    return
  }

  normalizeDocNondestructive(doc)

  if (!doc.paragraphs || !doc.paragraphs.length) {
    console.error(`missing paragraphs ✖️  ${doc.url}`)
    return
  }
  if (/* args.checkDate && */ !doc.date) {
    // console.error(`no date ✖️  ${doc.url}`)
    // return
  }
  // early filtering
  if (/* args.checkUkr &&  */ !isConsideredUkrainan(doc.paragraphs, analyzer)) {
    let sample = mu(doc.paragraphs).join(' ').substr(0, 38)
    console.error(`considered foreign ✖️  ${sample} ${doc.url || ''}`)
    return
  }

  writeFileSyncMkdirp(outPath, JSON.stringify(doc, undefined, 2))
}

function normalizeDocNondestructive(doc: CorpusDoc) {
  doc.paragraphs = mapInplace(
    doc.paragraphs,
    normalizeZvidusilParaNondestructive,
  ).filter((x) => x)
  doc.title = doc.title && normalizeZvidusilParaNondestructive(doc.title)
  doc.author = doc.author && normalizeZvidusilParaNondestructive(doc.author)
  doc.authors =
    doc.authors &&
    doc.authors.map((x) => normalizeZvidusilParaNondestructive(x))
  doc.date = doc.date && doc.date.trim()
}

function isConsideredUkrainan(
  paragraphs: Array<string>,
  analyzer: MorphAnalyzer,
) {
  const THRESHOLD = 0.2

  paragraphs = shuffle(paragraphs)
  let numTotal = 0
  let numX = 0
  for (let i = paragraphs.length - 1; i >= 0; --i) {
    let tokens = tokenizeUk(paragraphs[i], analyzer)
    numX += tokens.filter(
      ({ token }) => !analyzer.tag(token).filter((x) => !x.isX()).length,
    ).length
    numTotal += tokens.length
    if (numTotal >= 30) {
      return numX / numTotal < THRESHOLD
    }
  }

  if (numTotal) {
    if (numTotal < 15) {
      if (paragraphs.some((p) => /[їєґі]/.test(p))) {
        return true
      }
      if (paragraphs.some((p) => /[ыэёъ]/.test(p))) {
        return false
      }
    }
    return numX / numTotal < THRESHOLD
  }
}

export function prepareZvidusilMeta(value) {
  if (value.url) {
    value.tld = getDomain(value.url)
  }
}
