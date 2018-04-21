#!/usr/bin/env node


import { logErrAndExit, writeJoin, linesSync } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { parseXmlFileSync } from '../../xml/utils.node'
import { AbstractElement } from 'xmlapi'
import { conlluStrAndMeta2vertical } from '../tovert'
import { mu } from '../../mu'

import * as glob from 'glob'
import * as mkdirp from 'mkdirp'

import * as path from 'path'
import * as fs from 'fs'
import { countNumMatches } from '../../string_utils';
import { DefaultMap, HashSet } from '../../data_structures';
import { streamparseConllu, getCol, ConlluField } from '../../nlp/ud/conllu';
import { buildMap } from '../../lang';
import { generateRegistryFile } from '../registry_file_builder';



interface Args {
  // udpipeUrl: string
}

const udpipeApiLangMap = {
  'uk': {
    url: 'https://api.mova.institute/udpipe/process',
    model: 'uk',
  },
  'de': {
    model: 'german-ud-2.0-170801',
  },
  'cs': {
    model: 'czech-ud-2.0-170801',
  },
  'en': {
    model: 'english-ud-2.0-170801',
  },
  'fr': {
    model: 'french-ud-2.0-170801',
  },
  'pl': {
    model: 'polish-ud-2.0-170801',
  },
}
// udpipeApiLangMap['ua'] = udpipeApiLangMap['uk']
let langsServedByUfal = [
  'de',
  'cs',
  'en',
  'fr',
  'pl',
]
langsServedByUfal.forEach(x => udpipeApiLangMap[x].url =
  'http://lindat.mff.cuni.cz/services/udpipe/api/process')


//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  let [stage, alignFilesGlob] = process.argv.slice(2)
  let alignFiles = glob.sync(alignFilesGlob)

  if (stage === 'annotate') {
    await annotate(alignFiles)
  } else if (stage === 'therest') {
    therest(alignFiles)
  } else {
    throw new Error(`No action specified`)
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function annotate(alignFiles: string[]) {
  for (let alignFile of alignFiles) {
    let { alignDoc, leftDoc, rigtDoc, leftDocName, rightDocName, leftLang, rightLang } =
      prepareFromAlignment(alignFile)


    console.error(`processing "${leftLang}_${rightLang}" alignment file: ${alignFile}`)

    for (let [doc, docName, lang, oppositeLang] of [
      [leftDoc, leftDocName, leftLang, rightLang],
      [rigtDoc, rightDocName, rightLang, leftLang],
    ]) {
      let outDir = 'conllu'
      mkdirp.sync(outDir)
      let destConllu = path.join(outDir, docName as string)
      if (fs.existsSync(destConllu)) {
        console.error(`skipping ${docName}: conllu exists`)
        continue
      }

      if (!(lang in udpipeApiLangMap)) {
        console.error(`skipping "${lang}": no model set`)
        continue
      }
      let { url, model } = udpipeApiLangMap[lang as string]  // todo
      let udpipe = new UdpipeApiClient(url, model)

      let plaintext = intertextDoc2HorizontalPlaintext(doc as AbstractElement)
      let sentIds = getSentIdsFromIntertextDoc(doc as AbstractElement)

      console.error(
        `annotating ${plaintext.length} chars of "${lang}" via "${url}", model "${model}"`)
      let conllu = await udpipe.tokTagParseHorizontal(plaintext)
      // console.error(conllu)

      let numSents = countNumMatches(conllu, /^1\t/gm)
      console.error(`  got ${numSents} sents back`)
      if (numSents !== sentIds.length) {
        throw new Error(`numSents !== sentIds.length`)
      }

      fs.writeFileSync(destConllu, conllu)
    }
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function therest(alignFiles: string[]) {
  console.error(`Gathering morph features from conllus…`)
  let langFeats = new DefaultMap<string, Set<string>>(Set)
  for (let conlluPath of glob.sync(path.join('conllu', '*'))) {
    let lang = conlluPath.match(/\.(\w+)\.xml$/)[1]
    getFeatsFromConllu(linesSync(conlluPath), langFeats.get(lang))
  }
  let langFeatsArr = buildMap(
    mu(langFeats).map(([lang, set]) => [lang, [...set].sort()] as [string, string[]])  // todo
  )

  console.error(`Generating vertical files…`)

  let langPairs = new HashSet<string[]>()
  for (let alignFile of alignFiles) {
    let { leftDoc, rigtDoc, leftDocName, rightDocName, leftLang, rightLang } =
      prepareFromAlignment(alignFile)

    console.error(`processing "${leftLang}_${rightLang}" alignment file: ${alignFile}`)

    for (let [doc, docName, lang, oppositeLang] of [
      [leftDoc, leftDocName, leftLang, rightLang],
      [rigtDoc, rightDocName, rightLang, leftLang],
    ]) {
      let conllu = fs.readFileSync(path.join('conllu', docName as string), 'utf8')
      let sentIds = getSentIdsFromIntertextDoc(doc as AbstractElement)
      let outDir = 'vertical'
      mkdirp.sync(outDir)
      langPairs.add([lang as string, oppositeLang as string])
      let corporaId = `${lang}_${oppositeLang}`
      let destVertical = path.join(outDir, corporaId)

      let vertStream = conlluStrAndMeta2vertical(conllu, {
        meta: {
          title: leftDocName,
        } as any,
        featsOrder: langFeatsArr.get(lang as string)
      })
      let vertLines = mu(vertStream).toArray()
      let sIdx = 0
      for (let [i, line] of vertLines.entries()) {
        if (line === '<s>') {
          vertLines[i] = `<s id="${sentIds[sIdx++]}">`
        }
      }
      let ws = fs.createWriteStream(destVertical)
      await writeJoin(vertLines, ws, '\n', true)
      ws.close()
    }
  }

  console.error(`Generating registry files…`)

  let registry = process.env['MANATEE_REGISTRY']
  if (!registry) {
    throw new Error(`MANATEE_REGISTRY env var not set`)
  }
  for (let [lang, alignedLang] of langPairs) {
    let corporaId = `${lang}_${alignedLang}`
    let registryFile = generateRegistryFile({
      title: corporaId,
      langCode: lang,
    })
    fs.writeFileSync(path.join(registry, corporaId), registryFile)
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function getFeatsFromConllu(conllu: Iterable<string>, set = new Set<string>()) {
  for (let { token } of streamparseConllu(conllu)) {
    if (token) {
      for (let feat in token.feats) {
        set.add(feat)
      }
    }
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function getFeatsFromConllu2(conllu: Iterable<string>, set = new Set<string>()) {
  for (let line of conllu) {
    let feats = getCol(line, ConlluField.feats)
    if (feats && feats !== '_') {
      feats.split('|')
        .map(x => x.match(/^([^=]+)=/)[1])
        .forEach(x => set.add(x))
    }
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function getLangsFromAlignmentPath(alignFilePath: string) {
  return path.basename(alignFilePath).match(/\.(\w+)\.(\w+)(\.alignment)?\.xml$/).slice(1)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function prepareFromAlignment(alignFilePath: string) {
  let [leftLang, rightLang] = getLangsFromAlignmentPath(alignFilePath)
  let alignDoc = parseXmlFileSync(alignFilePath)
  let linkGrpEl = alignDoc.evaluateElement('//linkGrp')
  let leftDocPath = linkGrpEl.attribute('fromDoc')
  let rightDocPath = linkGrpEl.attribute('toDoc')
  leftDocPath = path.resolve(path.dirname(alignFilePath), leftDocPath)
  rightDocPath = path.resolve(path.dirname(alignFilePath), rightDocPath)
  let leftDoc = parseXmlFileSync(leftDocPath)
  let rigtDoc = parseXmlFileSync(rightDocPath)

  return {
    alignDoc,
    leftLang,
    rightLang,
    leftDoc,
    rigtDoc,
    leftDocName: path.basename(leftDocPath),
    rightDocName: path.basename(rightDocPath),
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function intertextDoc2HorizontalPlaintext(root: AbstractElement) {
  let ret = ''
  // let ids = new Array<string>()
  let pEls = ([...root.evaluateElements('//p')] as AbstractElement[])
  for (let pEl of pEls) {
    let sentEls = [...pEl.evaluateElements('.//s')] as AbstractElement[]
    if (!sentEls.length) {
      continue
    }
    // ids.push(...sentEls.map(x => x.attribute('id')))
    ret += sentEls.map(x => x.text().replace(/[\r\t\n]+/g, ' ')).join('\n')
    ret += '\n\n'
  }

  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function getSentIdsFromIntertextDoc(root: AbstractElement) {
  return ([...root.evaluateElements('.//s')] as AbstractElement[])
    .filter(x => x.text().trim())
    .map(x => x.attribute('id'))
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
