#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

import * as glob from 'glob'
import * as minimist from 'minimist'
import * as mkdirp from 'mkdirp'
import * as columnify from 'columnify'

import { parseXmlFileSync } from '../../xml/utils.node'
import { tei2tokenStream, tokenStream2sentences, normalizeMorphoForUd } from '../../nlp/utils'
import { last } from '../../lang'
import { Dict } from '../../types'
// import { toUdString, toUd } from './tagset'
import { Token } from '../../nlp/token'
import { MorphInterp } from '../../nlp/morph_interp'
import { sentence2conllu } from './utils'
import { mu } from '../../mu'
import { validateSentenceSyntax, CORE_COMPLEMENTS } from './validation'
import { zerofillMax } from '../../string_utils'



//------------------------------------------------------------------------------
interface Args {
  _: string[]
  noStandartizing: boolean
  includeIncomplete: boolean
  oneSet: string

  datasetSchema: string
  reportHoles: boolean
  reportErrors: 'all' | 'complete' | 'none'
  validOnly: boolean
  xpos: any
}

//------------------------------------------------------------------------------
class Dataset {
  file: number
  counts = {
    wordsKept: 0,
    wordsExported: 0,
    sentsExported: 0,
  }
  newdoc = false
}

//------------------------------------------------------------------------------
const REL_RENAMINGS = {
  'obj:mark': 'obj',
  'iobj:mark': 'iobj',
  'obl:mark': 'obl',
  'nsubj:mark': 'nsubj',
  'conj:parataxis': 'conj',
  'conj:repeat': 'conj',
  'obl:agent': 'obl',
}

//------------------------------------------------------------------------------
function main() {
  let args: Args = minimist(process.argv.slice(2), {
    boolean: [
      'noStandartizing',
      'includeIncomplete',
      'reportHoles',
      'onlyValid',
    ],
    alias: {
      oneSet: 'one-set',
      noStandartizing: 'no-std',

      datasetSchema: 'dataset-schema',
      validOnly: 'valid-only',
      reportHoles: 'report-holes',
      reportErrors: 'report-errors',
    },
    default: {
      reportErrors: 'all',
      reportHoles: true,
      datasetSchema: 'mi',
    }
  }) as any

  let [globStr, outDir] = args._
  let xmlPaths = glob.sync(globStr)
  if (!xmlPaths.length) {
    return
  }

  mkdirp.sync(outDir)

  let openedFiles = {} as any
  let datasetRegistry = {} as Dict<Dataset>
  let sentenseErrors = []
  let sentenseHoles = []
  for (let xmlPath of xmlPaths) {
    let basename = path.basename(xmlPath)

    console.log(`exporting ${basename}`)

    let root = parseXmlFileSync(xmlPath)
    let tokenStream = tei2tokenStream(root, args.datasetSchema)
    let sentenceStream = mu(tokenStream2sentences(tokenStream))
    for (let { sentenceId, set, tokens, newParagraph, newDocument } of sentenceStream) {
      initSyntax(tokens)
      let hasSyntax = tokens.some(x => x.hasDeps())
      set = args.oneSet || set || 'unassigned'
      if (hasSyntax) {
        datasetRegistry[set] = datasetRegistry[set] || new Dataset()

        let numTokens = tokens.length
        let roots = mu(tokens).findAllIndexes(x => !x.hasDeps()).toArray()
        let isComplete = roots.length === 1

        if (!roots.length) {
          datasetRegistry[set].counts.wordsKept += numTokens
          sentenseErrors.push({
            sentenceId,
            problems: [{ message: 'цикл' }],
            tokens: tokens.map(x => x.toString()),
            bratPath: getBratPath(tokens[0]),
          })
          continue
        } else if (!isComplete && args.reportHoles) {
          sentenseHoles.push({
            sentenceId,
            problems: [{ message: 'речення недороблене', indexes: roots }],
            tokens: tokens.map(x => x.toString()),
            bratPath: getBratPath(tokens[0]),
          })
        }

        let hasProblems = false
        if (args.reportErrors === 'all' || args.reportErrors === 'complete' && isComplete || args.validOnly) {
          let problems = validateSentenceSyntax(tokens)
          hasProblems = !!problems.length
          if (hasProblems && args.reportErrors) {
            sentenseErrors.push({
              problems,
              sentenceId,
              tokens: tokens.map(x => x.toString()),
              bratPath: getBratPath(tokens[0]),
            })
          }
        }

        if (args.validOnly && hasProblems) {
          datasetRegistry[set].counts.wordsKept += numTokens
        } else {
          if (!isComplete) {
            datasetRegistry[set].counts.wordsKept += numTokens
          }
          if (isComplete || args.includeIncomplete) {
            ++datasetRegistry[set].counts.sentsExported
            datasetRegistry[set].counts.wordsExported += numTokens
            if (!args.noStandartizing) {
              standartizeSentence2ud20(tokens)
            }

            let filename = set2filename(outDir, args.datasetSchema, set)
            let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
            let conlluedSentence = sentence2conllu(tokens, sentenceId, newParagraph, newDocument, { xpos: args.xpos })
            fs.writeSync(file, conlluedSentence + '\n\n')
            datasetRegistry[set].newdoc = false
          }
        }
      }

      standartizeMorpho(tokens)
      let filename = path.join(outDir, `uk-mi-${set}.morphonly.conllu`)
      let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
      let conlluedSentence = sentence2conllu(tokens, sentenceId, newParagraph, newDocument, { morphOnly: true })
      fs.writeSync(file, conlluedSentence + '\n\n')
    }
  }

  if (sentenseErrors.length) {
    fs.writeFileSync(path.join(outDir, 'errors.html'), formatProblemsHtml(sentenseErrors))
  }

  if (sentenseHoles.length) {
    fs.writeFileSync(path.join(outDir, 'holes.html'), formatProblemsHtml(sentenseHoles))
  }

  printStats(datasetRegistry)
}

//------------------------------------------------------------------------------
function printStats(datasetRegistry: Dict<Dataset>) {
  let stats = Object.entries(datasetRegistry).map(([set, { counts: { wordsKept, wordsExported, sentsExported } }]) => ({
    set,
    't kept': wordsKept,
    't exported': wordsExported,
    's exported': sentsExported,
  }))
  stats.push({
    set: 'TOTAL',
    't kept': stats.map(x => x['t kept']).reduce((a, b) => a + b, 0),
    't exported': stats.map(x => x['t exported']).reduce((a, b) => a + b, 0),
    's exported': stats.map(x => x['s exported']).reduce((a, b) => a + b, 0),
  })

  console.log(`\n`)
  console.log(columnify(stats, {
    config: {
      kept: {
        align: 'right',
      },
      exported: {
        align: 'right',
      },
    },
  }))
  console.log(`\n`)
}

//------------------------------------------------------------------------------
function getBratPath(token: Token) {
  return token.getAttribute('depsrc').slice('/Users/msklvsk/Developer/mova-institute/playground/4brat/'.length, -4)
}

//------------------------------------------------------------------------------
function formatProblemsHtml(sentenceProblems: any[]) {
  let body = ''
  for (let [i, { sentenceId, problems, tokens, bratPath }] of sentenceProblems.entries()) {
    let href = `https://lab.mova.institute/brat/index.xhtml#/ud/${bratPath}`
    let problemNumber = zerofillMax(i + 1, sentenceProblems.length)

    body += `<div><b>#${problemNumber}</b> реч.#${sentenceId}: <a href="${href}" target="_blank">${bratPath}</a><br/>`
    for (let { indexes, message } of problems) {
      body += `<p class="message">- ${message}</p>`
      if (indexes !== undefined) {
        for (let j = 0; j < tokens.length; ++j) {
          if (indexes.includes(j)) {
            body += `<span class="error">${tokens[j]}</span> `
          } else {
            body += `${tokens[j]} `
          }
        }
      }
      body += `<br/><br/>`
    }
    body += `<div><hr/>`
  }

  return `<html><head><style>
    html { padding: 3em; font-size: 14px; font-family: "Lucida Console", Menlo, Monaco, monospace; }
    .error { padding: 0.25em; border: 2px solid #FFAB40; color: #555; }
    .message { color: #555; margin-left:-2ch; }
  </style></head><body>${body}</body>`
}

//------------------------------------------------------------------------------
function set2filename(dir: string, setSchema: string, setName: string) {
  return path.join(dir, `uk-${setSchema}-${setName}.conllu`)
}

//------------------------------------------------------------------------------
function initSyntax(sentence: Array<Token>) {
  let id2i = {} as any
  for (let i = 0; i < sentence.length; ++i) {
    id2i[sentence[i].id] = i
  }
  let changed = new Set<number>()
  for (let token of sentence) {
    for (let dep of token.deps) {
      if (!changed.has(token.id)) {
        if (id2i[token.head] === undefined) {
          // console.log(`head outside sentence`)
          console.log(sentence)
          console.log(id2i)
          console.log(token.id)
          console.log(token.head)
          throw new Error(`head outside sentence`)
        }
        dep.head = id2i[token.head]
        changed.add(token.id)
      }
    }
  }
}

//------------------------------------------------------------------------------
// const FOREIGN = MorphInterp.fromVesumStr('x:foreign')
function standartizeMorpho(sentence: Array<Token>) {
  for (let token of sentence) {
    normalizeMorphoForUd(token.interp, token.form)

    // token.interp.killNongrammaticalFeatures()
    token.interp.setIsAuxillary(false)

    if (token.interp.isForeign()) {
      token.interps = [MorphInterp.fromVesumStr('x:foreign').setLemma(token.interp.lemma)]
    }

    if (token.interp.isTypo()) {
      let correction = token.getAttribute('correct')
      if (correction) {
        token.form = correction
        token.interp.setIsTypo(false)
      } else {
        console.error(`No typo correction for ${token}`)
      }
    }

    if (token.interp.isAdjectiveAsNoun() && token.interp.isOrdinalNumeral()) {
      token.interp.setIsOrdinalNumeral(false)
    }

    if (token.interp.lemma === 'бути' && ['є', 'Є'].includes(token.form) && token.interp.isVerb()) {
      token.interp.features.person = undefined
      token.interp.features.number = undefined
    }
  }
}

//------------------------------------------------------------------------------
function standartizeSentence2ud20(sentence: Array<Token>) {
  let lastToken = last(sentence)
  let rootIndex = sentence.findIndex(x => !x.hasDeps())

  for (let token of sentence) {
    // choose (punct) relation from the rigthtest token
    token.deps = token.deps.sort((a, b) => a.head - b.head).slice(0, 1)

    // set AUX
    if (['aux', 'aux:pass', 'cop'].includes(token.rel)) {
      token.interp.setIsAuxillary()
    }

    // set the only iobj to obj
    if (token.rel === 'iobj' && !sentence.some(tt => tt.head === token.head && CORE_COMPLEMENTS.includes(tt.rel))) {
      token.rel = 'obj'
    }

    // simple-rename internal rels
    if (token.hasDeps()) {
      token.rel = REL_RENAMINGS[token.rel] || token.rel
    }

    // // move dislocated to its head's head, see docs and https://github.com/UniversalDependencies/docs/issues/345
    // // internally we annoate it deliberately against UD to preserve more info
    // if (token.rel === 'dislocated') {
    //   token.head = sentence[token.head].head
    //   if (token.head === undefined) {
    //     console.error(sentence.map(x => x.form).join(' '))
    //     throw new Error(`"dislocated" from root`)
    //   }
    // }
  }

  // set parataxis punct to the root
  let thecase = lastToken.interp.isPunctuation() && sentence[lastToken.head] && sentence[lastToken.head].rel === 'parataxis'
  if (thecase) {
    lastToken.head = rootIndex
  }
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
