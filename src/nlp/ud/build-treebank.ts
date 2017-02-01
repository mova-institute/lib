#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { parseXmlFileSync } from '../../xml/utils.node'
import { tei2tokenStream, tokenStream2sentences, tokenStream2plaintextString } from '../../nlp/utils'
import { Token } from '../../nlp/token'
import { sentence2conllu } from './utils'
import { mu } from '../../mu'
import { validateSentence } from './validation'
import { AbstractElement } from 'xmlapi'

import * as glob from 'glob'
import * as minimist from 'minimist'
import * as mkdirp from 'mkdirp'




function main() {
  // const args: any = minimist(process.argv.slice(2), {
  //   default: {
  //     'outDir': './treebank',
  //   },
  //   string: [

  //   ],
  // })

  let [, , globStr, outDir] = process.argv
  let roots = mu(glob.sync(globStr)).map(x => ({ root: parseXmlFileSync(x), basename: path.basename(x) }))
  mkdirp.sync(outDir)
  let openedFiles = {} as any

  let wordsExported = 0
  let wordsKept = 0
  for (let {root, basename} of roots) {
    let tokenStream = tei2tokenStream(root)
    let sentenceStream = mu(tokenStream2sentences(tokenStream))
    sentenceStream.forEach(({sentenceId, set, tokens}) => {

      let hasSyntax = tokens.some(x => x.hasSyntax())
      if (!hasSyntax) {
        return
      }

      let numWords = mu(tokens).count(x => !x.interp0().isPunctuation())
      let numRoots = mu(tokens).count(x => !x.relation)

      let problems = validateSentence(tokens)
      if (problems.length) {
        wordsKept += numWords
        console.error(formatProblems(basename, sentenceId, tokens, problems))
      } else if (numRoots > 1) {
        wordsKept += numWords
      } else {
        wordsExported += numWords

        let filename = set2filename(outDir, set || 'train')
        let file = openedFiles[filename] = openedFiles[filename] || fs.openSync(filename, 'w')
        fs.writeSync(file, sentence2conllu(tokens, sentenceId) + '\n\n')
      }
    })
  }
  console.error(`\nWords exported: ${wordsExported}\nWords kept: ${wordsKept}`)
}

if (require.main === module) {
  main()
}

//------------------------------------------------------------------------------
function formatProblems(docName: string, sentenceId: string, tokens: Token[], problems: any[]) {
  let bratPath = tokens.find(x => x.getAttribute('depsrc')).getAttribute('depsrc').slice('/Users/msklvsk/Desktop/treebank/'.length, -4)
  let href = `https://lab.mova.institute/syntax_annotator/index.xhtml#/treebank/ud2/${bratPath}`
  let ret = `Проблеми в реченні ${sentenceId} ${href}\n`
  let repro = tokens.join(' ')
  for (let [i, {index, message}] of problems.entries()) {
    ret += `  ${message}\n`
    ret += `    ${repro}\n`
    ret += `    ${' '.repeat(calculateTokenOffset(index, tokens))}${'^'.repeat(tokens[index].form.length)}\n`
  }
  ret += '\n'
  return ret
}

//------------------------------------------------------------------------------
function calculateTokenOffset(index: number, tokens: Token[]) {
  let ret = 0
  for (let i = 0; i < index; ++i) {
    ret += tokens[i].form.length + 1
  }
  return ret
}

//------------------------------------------------------------------------------
function set2filename(dir: string, setName: string) {
  return path.join(dir, `uk-ud-${setName}.conllu`)
}
