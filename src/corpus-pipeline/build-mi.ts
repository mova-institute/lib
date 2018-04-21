#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

import * as glob from 'glob'
import * as minimist from 'minimist'
import * as mkdirp from 'mkdirp'

import { parseXmlFileSync } from '../xml/utils.node'
import { mixml2tokenStream, tokenStream2sentences } from '../nlp/utils'
import { AbstractElement } from 'xmlapi'
import { trimExtension } from '../string_utils'
import { toUd } from '../nlp/ud/tagset'
import { token2verticalLineUk } from './ud'
import { mu } from '../mu'
import { keyvalue2attributesNormalized } from '../nlp/noske_utils'
import { standartizeMorphoForUd21 } from '../nlp/ud/uk_grammar';



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

    console.log(`verticalizing ${basename}`)

    let root = parseXmlFileSync(xmlPath)
    let docRoots = [...root.evaluateElements('//doc[not(ancestor::doc)]')]
    if (!docRoots.length) {
      docRoots = [root]
    }

    for (let [i, docRoot] of docRoots.entries()) {
      let outDirVertical = path.join(args.outDir, 'vertical', relDirname)
      let outPathVertical = path.join(outDirVertical, `${basename}_${i}.vrt`)
      mkdirp.sync(outDirVertical)

      // build meta
      let docMeta: any = {
        title: docRoot.attribute('title') || basename,
      }
      docMeta.reference_title = docMeta.title
      for (let attribute of ['author', 'date', 'url']) {
        docMeta[attribute] = docRoot.attribute(attribute)
      }
      if (!docMeta.href) {
        docMeta.url = docRoot.attribute('src')
      }

      let vertical = mu(streamVertical(docRoot, docMeta)).join('\n', true)
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
function* streamVertical(root: AbstractElement, docMeta) {
  yield `<doc ${keyvalue2attributesNormalized(docMeta)}>`
  yield '<p>'
  let tokenStream = mixml2tokenStream(root)
  let sentenceStream = mu(tokenStream2sentences(tokenStream))
  let first = true
  for (let { sentenceId, tokens } of sentenceStream) {
    if (!first && tokens[0].opensParagraph) {
      yield '</p>'
      yield '<p>'
    }
    yield `<s id="${sentenceId}">`
    for (let token of tokens) {
      standartizeMorphoForUd21(token.interp, token.form)
      let { pos, features } = toUd(token.interp)
      yield token2verticalLineUk(token.form, token.interp.lemma,
        pos, features, token.rel, token.index, token.headIndex, token.getAttribute('id'))
      if (token.gluedNext) {
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
  let tokenStream = mixml2tokenStream(root)
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
