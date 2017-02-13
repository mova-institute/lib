#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { tei2tokenStream, tokenStream2sentences } from '../../nlp/utils'
import { last } from '../../lang'
import { Token } from '../../nlp/token'
import { sentence2conllu } from './utils'
import { mu } from '../../mu'
import { validateSentenceSyntax, CORE_COMPLEMENTS } from './validation'

import * as glob from 'glob'
import * as minimist from 'minimist'
import * as mkdirp from 'mkdirp'
import * as columnify from 'columnify'



//------------------------------------------------------------------------------
interface Args {
  _: string[]
  noStandartizing: boolean
  oneSet: string

  reportHoles: boolean
  reportErrors: 'all' | 'complete' | 'none'
  validOnly: boolean
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
  'mark:obj': 'obj',
  'mark:iobj': 'iobj',
  'mark:obl': 'obl',
  'mark:nsubj': 'nsubj',
  'conj:parataxis': 'conj',
  'conj:repeat': 'conj',
  'obl:agent': 'obl',
}

//------------------------------------------------------------------------------
function main() {
  let args: Args = minimist(process.argv.slice(2), {
    boolean: [
      'noStandartizing',
      'reportHoles',
      'onlyValid',
    ],
    alias: {
      oneSet: 'one-set',
      noStandartizing: 'no-std',

      validOnly: 'valid-only',
      reportHoles: 'report-holes',
      reportErrors: 'report-errors',
    },
    default: {
      reportErrors: 'none',
    }
  }) as any

  let [globStr, outDir] = args._
  let xmlPaths = glob.sync(globStr)
  mkdirp.sync(outDir)

  let openedFiles = {} as any
  let datasetRegistry = {} as { [name: string]: Dataset }
  let problemCounter = 1
  for (let xmlPath of xmlPaths) {
    let basename = path.basename(xmlPath)
    console.log(`exporting ${basename}`)
    let root = parseXmlFileSync(xmlPath)
    let tokenStream = tei2tokenStream(root)
    let sentenceStream = mu(tokenStream2sentences(tokenStream))
    for (let {sentenceId, set, tokens, newParagraph, newDocument } of sentenceStream) {
      initSyntax(tokens)
      let hasSyntax = tokens.some(x => x.hasDeps())
      if (!hasSyntax) {
        continue
      }

      set = args.oneSet || set || 'unassigned'
      datasetRegistry[set] = datasetRegistry[set] || new Dataset()
      // if (newDocument) {
      // Object.values(datasetRegistry).forEach(x => x.newdoc = true)
      // }

      let numWords = mu(tokens).count(x => !x.interp.isPunctuation())
      let roots = mu(tokens).findAllIndexes(x => !x.hasDeps()).toArray()
      let isComplete = roots.length === 1

      if (!roots.length) {
        datasetRegistry[set].counts.wordsKept += numWords
        console.error(formatProblems(basename, sentenceId, tokens, [{ message: 'цикл' }], problemCounter++))
        continue
      } else if (!isComplete && args.reportHoles) {
        console.error(formatProblems(basename, sentenceId, tokens, [{ message: 'речення недороблене', indexes: roots }], problemCounter++))
      }

      let hasProblems = false
      if (args.reportErrors === 'all' || args.reportErrors === 'complete' && isComplete || args.validOnly) {
        var problems = validateSentenceSyntax(tokens)
        hasProblems = !!problems.length
        if (hasProblems && args.reportErrors !== 'none') {
          console.error(formatProblems(basename, sentenceId, tokens, problems, problemCounter++))
        }
      }

      if (args.validOnly && hasProblems) {
        datasetRegistry[set].counts.wordsKept += numWords
      } else if (!isComplete) {
        datasetRegistry[set].counts.wordsKept += numWords
      } else {
        ++datasetRegistry[set].counts.sentsExported
        datasetRegistry[set].counts.wordsExported += numWords
        if (!args.noStandartizing) {
          standartizeSentence2ud20(tokens)
        }

        let filename = set2filename(outDir, set)
        let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
        let conlluedSentence = sentence2conllu(tokens, sentenceId, newParagraph, newDocument)
        fs.writeSync(file, conlluedSentence + '\n\n')
        datasetRegistry[set].newdoc = false
      }
    }
  }

  let stats = Object.entries(datasetRegistry).map(([set, {counts: {wordsKept, wordsExported, sentsExported}}]) => ({
    set,
    'w kept': wordsKept,
    'w exported': wordsExported,
    's exported': sentsExported,
  }))
  stats.push({
    set: 'TOTAL',
    'w kept': stats.map(x => x['w kept']).reduce((a, b) => a + b, 0),
    'w exported': stats.map(x => x['w exported']).reduce((a, b) => a + b, 0),
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

if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
function formatProblems(docName: string, sentenceId: string, tokens: Token[], problems: any[], count: number) {
  let tokenWithDepsrc = tokens.find(x => x.getAttribute('depsrc'))
  let bratPath = tokenWithDepsrc && tokenWithDepsrc.getAttribute('depsrc').slice('/Users/msklvsk/Desktop/treebank/'.length, -4)
  let href = `https://lab.mova.institute/brat/index.xhtml#/ud/${bratPath}`
  let ret = `*** [${count}] Проблеми в реченні ${sentenceId} ${href}\n\n`
  let repro = tokens.join(' ')
  for (let {indexes, message} of problems) {
    ret += `    ${message}\n`
    ret += `${repro}\n`
    if (indexes !== undefined) {
      for (let j = 0; j < tokens.length; ++j) {
        let char = indexes.includes(j) ? '^' : ' '
        ret += char.repeat(tokens[j].form.length) + ' '
      }
      ret += '\n'
    }
  }
  ret += '\n'
  return ret
}

//------------------------------------------------------------------------------
function set2filename(dir: string, setName: string) {
  return path.join(dir, `uk-ud-${setName}.conllu`)
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

    // remove degree from &noun
    if (token.interp.isAdjectiveAsNoun()) {
      token.interp.features.degree = undefined
    }

    // move dislocated to its head's head, see docs and https://github.com/UniversalDependencies/docs/issues/345
    // internally we are doing it deliberately against UD to preserve more info
    if (token.rel === 'dislocated') {
      token.head = sentence[token.head].head
      if (!token.head) {
        throw new Error(`"dislocated" from root`)
      }
    }
  }

  // set parataxis punct to the root
  let thecase = lastToken.interp.isPunctuation() && sentence[lastToken.head] && sentence[lastToken.head].rel === 'parataxis'
  if (thecase) {
    lastToken.head = rootIndex
  }
}



/*

autofix
cc/punct
obl:agent


*/
