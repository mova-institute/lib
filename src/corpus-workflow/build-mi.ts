#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

import * as glob from 'glob'
import * as minimist from 'minimist'
import * as mkdirp from 'mkdirp'
import * as columnify from 'columnify'

import { parseXmlFileSync } from '../xml/utils.node'
import { tei2tokenStream, tokenStream2sentences } from '../nlp/utils'
import { AbstractElement } from 'xmlapi'
import { last } from '../lang'
import { trimExtension } from '../string_utils'
import { Dict } from '../types'
import { Token } from '../nlp/token'
import { toUd } from '../nlp/ud/tagset'
import { token2verticalLine } from './ud'
// import { sentence2conllu } from './utils'
import { mu } from '../mu'
// import { validateSentenceSyntax, CORE_COMPLEMENTS } from './validation'



//------------------------------------------------------------------------------
interface Args {
  _: string[]
  inputRoot: string
  inputGlob: string
  outDir: string
}

//------------------------------------------------------------------------------
function getArgs() {
  return minimist(process.argv.slice(2), {
    boolean: [
    ],
    alias: {
    },
    default: {
    }
  }) as Args
}

//------------------------------------------------------------------------------
function main() {
  let args = getArgs()

  let xmlPaths = glob.sync(path.join(args.inputRoot, args.inputGlob))

  for (let xmlPath of xmlPaths) {
    let basename = trimExtension(path.basename(xmlPath))
    let inputDirname = path.dirname(xmlPath)
    let relDirname = path.relative(inputDirname, args.inputRoot)

    let root = parseXmlFileSync(xmlPath)
    let docRoots = [root]
    for (let docRoot of docRoots) {
      let outDirVertical = path.join(args.outDir, 'vertical', relDirname)
      let outPathVertical = path.join(outDirVertical, `${basename}_0.vrt`)
      mkdirp.sync(outDirVertical)
      let vertical = mu(streamVertical(docRoot, basename)).join('\n', true)
      fs.writeFileSync(outPathVertical, vertical)

      let outDirVector = path.join(args.outDir, '4vec', relDirname)
      let outPathVector = path.join(outDirVector, `${basename}_0.4vec`)
      mkdirp.sync(outDirVector)
      let forvecForms = mu(stream4vec(root)).map(([forms]) => forms).join('\n', true)
      fs.writeFileSync(outPathVector, forvecForms)
    }
  }
}

//------------------------------------------------------------------------------
function* streamVertical(root: AbstractElement, title: string) {
  yield `<doc title="${title}" reference_title="${title}">`
  yield '<p>'
  let tokenStream = tei2tokenStream(root)
  let sentenceStream = mu(tokenStream2sentences(tokenStream))
  let first = true
  for (let { sentenceId, tokens, newParagraph } of sentenceStream) {
    if (!first && newParagraph) {
      yield '</p>'
      yield '<p>'
    }
    yield `<s id="${sentenceId}">`
    for (let token of tokens) {
      let { pos, features } = toUd(token.interp)
      yield token2verticalLine(token.form, token.interp.lemma, pos, features, token.rel)
      if (token.glued) {
        yield '<g/>'
      }
    }
    yield '</s>'
    first = false
  }
  yield '</p>'
  yield '</doc>'
}

//------------------------------------------------------------------------------
function* stream4vec(root: AbstractElement) {
  let tokenStream = tei2tokenStream(root)
  let sentenceStream = mu(tokenStream2sentences(tokenStream))
  for (let { tokens } of sentenceStream) {
    tokens = tokens.filter(x => !x.interp.isPunctuation())
    if (tokens) {
      let forms = tokens.map(x => x.form).join(' ')
      let lemmas = tokens.map(x => x.interp.lemma).join(' ')
      yield [forms, lemmas]
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main()
}
