#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { tei2tokenStream, tokenStream2sentences } from '../../nlp/utils'
import { last } from '../../lang'
import { Token } from '../../nlp/token'
import { sentence2conllu } from './utils'
import { mu } from '../../mu'
import { validateSentenceSyntax } from './validation'

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
    kept: 0,
    exported: 0,
  }
  newdoc = false
}

//------------------------------------------------------------------------------
const REL_RENAMINGS = {
  'mark:obj': 'obj:mark',
  'mark:iobj': 'iobj:mark',
  'mark:obl': 'obl:mark',
  'mark:nsubj': 'nsubj:mark',
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
  let xmlRoots = mu(glob.sync(globStr)).map(x => ({ root: parseXmlFileSync(x), basename: path.basename(x) }))
  mkdirp.sync(outDir)

  let openedFiles = {} as any
  let datasetRegistry = {} as { [name: string]: Dataset }
  let problemCounter = 1
  for (let {root, basename} of xmlRoots) {
    let tokenStream = tei2tokenStream(root)
    let sentenceStream = mu(tokenStream2sentences(tokenStream))
    for (let {sentenceId, set, tokens, newParagraph, newDocument } of sentenceStream) {
      initSyntax(tokens)
      let hasSyntax = tokens.some(x => x.hasDeps())
      if (!hasSyntax) {
        continue
      }

      set = args.oneSet || set || 'train'
      datasetRegistry[set] = datasetRegistry[set] || new Dataset()
      // if (newDocument) {
      // Object.values(datasetRegistry).forEach(x => x.newdoc = true)
      // }

      let numWords = mu(tokens).count(x => !x.interp.isPunctuation())
      let roots = mu(tokens).findAllIndexes(x => !x.hasDeps()).toArray()
      let isComplete = roots.length === 1

      if (!roots.length) {
        datasetRegistry[set].counts.kept += numWords
        console.error(formatProblems(basename, sentenceId, tokens, [{ message: 'цикл' }], problemCounter++))
        continue
      } else if (!isComplete && args.reportHoles) {
        console.error(formatProblems(basename, sentenceId, tokens, [{ message: 'речення недороблене', indexes: roots }], problemCounter++))
      }

      let hasProblems = false
      if (args.reportErrors === 'all' || args.reportErrors === 'complete' && isComplete || args.validOnly) {
        var problems = validateSentenceSyntax(tokens)
        hasProblems = !!problems.length
        if (hasProblems && args.reportErrors) {
          console.error(formatProblems(basename, sentenceId, tokens, problems, problemCounter++))
        }
      }

      if (args.validOnly && hasProblems) {
        datasetRegistry[set].counts.kept += numWords
      } else if (!isComplete) {
        datasetRegistry[set].counts.kept += numWords
      } else {
        datasetRegistry[set].counts.exported += numWords
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

  let stats = Object.entries(datasetRegistry).map(([set, {counts: {kept, exported}}]) => ({ set, kept, exported }))
  stats.push({ set: 'TOTAL', kept: stats.map(x => x.kept).reduce((a, b) => a + b, 0), exported: stats.map(x => x.exported).reduce((a, b) => a + b, 0) })

  console.error(`\n`)
  console.error(columnify(stats, {
    config: {
      kept: {
        align: 'right',
      },
      exported: {
        align: 'right',
      },
    },
  }))
  console.error(`\n`)
}

if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
function formatProblems(docName: string, sentenceId: string, tokens: Token[], problems: any[], count: number) {
  let tokenWithDepsrc = tokens.find(x => x.getAttribute('depsrc'))
  let bratPath = tokenWithDepsrc && tokenWithDepsrc.getAttribute('depsrc').slice('/Users/msklvsk/Desktop/treebank/'.length, -4)
  let href = `https://lab.mova.institute/syntax_annotator/index.xhtml#/treebank/ud2/${bratPath}`
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
    id2i[sentence[i].getAttribute('n')] = i
  }
  for (let token of sentence) {
    for (let dep of token.deps) {
      dep.head = id2i[token.head0]
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
    if (['aux', 'aux:pass', 'cop'].includes(token.rel0)) {
      token.interp.setIsAuxillary()
    }

    // set the only iobj to obj
    if (token.rel0 === 'iobj' && !sentence.some(tt => tt.head0 === token.head0 && tt.rel0 === 'obj')) {
      token.rel0 = 'obj'
    }

    // simple-rename internal rels
    if (token.hasDeps()) {
      token.rel0 = REL_RENAMINGS[token.rel0] || token.rel0
    }

    // remove degree from &noun
    if (token.interp.isAdjectiveAsNoun()) {
      // token.interp.features.degree = undefined
    }
  }

  // set parataxis punct to the root
  let thecase = lastToken.interp.isPunctuation() && sentence[lastToken.head0] && sentence[lastToken.head0].rel0 === 'parataxis'
  if (thecase) {
    lastToken.head0 = rootIndex
  }
}



/*

autofix
cc/punct
obl:agent


*/
