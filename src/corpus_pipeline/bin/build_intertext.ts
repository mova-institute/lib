#!/usr/bin/env node

import { logErrAndExit, linesSync } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { parseXmlFileSync } from '../../xml/utils.node'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { conlluStrAndMeta2vertical } from '../tovert'
import { mu, Mu } from '../../mu'

import * as glob from 'glob'
import * as mkdirp from 'mkdirp'
import * as minimist from 'minimist'

import * as path from 'path'
import * as fs from 'fs'
import { countNumMatches } from '../../string'
import { DefaultMap, HashSet } from '../../data_structures'
import { getCol, ConlluField } from '../../nlp/ud/conllu'
import { buildMap, createObject2 } from '../../lang'
import { renderFeatvals, STRUCTURE_G, positionalAttrGeneric } from '../registry_file_builder'
import { indexTableByColumn } from '../../algo'
import { execSync } from 'child_process'
import { Dict } from '../../types'



interface CliArgs {
  meta?: string
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
const langMetas = indexTableByColumn([
  {
    code: 'uk',
    ukName: 'українська',
    ukNameGen: 'української',
    ukNameDat: 'українській',
    ukNameMasc: 'український',
    ukAbbr: 'укр',
    name: 'Ukrainian',
    locale: 'uk_UA',
    nonwordre: '[^АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя’А-Яа-я[:alpha:]].*',
  },
  {
    code: 'fr',
    ukName: 'французька',
    ukNameGen: 'французької',
    ukNameDat: 'французькій',
    ukNameMasc: 'французький',
    ukAbbr: 'фр',
    name: 'French',
    locale: 'fr_FR',
  },
  {
    code: 'cs',
    ukName: 'чеська',
    ukNameGen: 'чеської',
    ukNameDat: 'чеській',
    ukNameMasc: 'чеський',
    ukAbbr: 'чес',
    name: 'Czech',
    locale: 'cs_CZ',
    // nonwordre: '',
  },
  {
    code: 'pl',
    ukName: 'польська',
    ukNameGen: 'польської',
    ukNameDat: 'польській',
    ukNameMasc: 'польський',
    ukAbbr: 'пол',
    name: 'Polish',
    locale: 'pl_PL',
    // nonwordre: '',
  },
  {
    code: 'de',
    ukName: 'німецька',
    ukNameGen: 'німецької',
    ukNameDat: 'німецькій',
    ukNameMasc: 'німецький',
    ukAbbr: 'нім',
    name: 'German',
    locale: 'de_DE',
    // nonwordre: '',
  },
  {
    code: 'en',
    ukName: 'англійська',
    ukNameGen: 'англійської',
    ukNameDat: 'англійській',
    ukNameMasc: 'англійський',
    ukAbbr: 'англ',
    name: 'English',
    locale: 'en_US',
  },
  {
    code: 'se',
    ukName: 'шведська',
    ukNameGen: 'шведської',
    ukNameDat: 'шведській',
    name: 'шведський',
    locale: 'se_SE',
    // nonwordre: '',
  },
  // {
  //   code: '',
  //   ukName: '',
  //   ukNameDat: '',
  //   name: '',
  //   locale: '',
  //   nonwordre: '',
  // },
], 'code')

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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
const firstRegistryPositionals = `
ATTRIBUTE word {
  DEFAULTVALUE ""
}
ATTRIBUTE lc {
  DEFAULTVALUE ""
  DYNAMIC "utf8lowercase"
  DYNLIB "internal"
  ARG1 "C"
  FUNTYPE "s"
  FROMATTR "word"
  TRANSQUERY "yes"
}
ATTRIBUTE lemma {
  DEFAULTVALUE ""
}
ATTRIBUTE lemma_lc {
  DEFAULTVALUE ""
  DYNAMIC "utf8lowercase"
  DYNLIB "internal"
  ARG1 "C"
  FUNTYPE "s"
  FROMATTR "lemma"
  TRANSQUERY "yes"
}
`
const registryStructures = `
STRUCTURE doc {
  ATTRIBUTE title_uk {
    LABEL "назва (українською)"
  }
  ATTRIBUTE original_language {
    LABEL "мова первотвору"
  }
  ATTRIBUTE is_original {
    LABEL "є первотвором"
  }
  ATTRIBUTE original_author_uk {
    LABEL "автор первотвору (ім’я українською)"
  }
  ATTRIBUTE translator_uk {
    LABEL "перекладач"
  }
  ATTRIBUTE wordcount {
    LABEL "токенів в документі"
    MAXLISTSIZE 0
  }
}
STRUCTURE p {
}
STRUCTURE s {
  ATTRIBUTE id {
    LABEL "код речення"
  }
}
`

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function main() {
  let [stage, alignFilesGlob] = process.argv.slice(2)
  let alignFiles = glob.sync(alignFilesGlob)

  if (stage === 'annotate') {
    await annotate(alignFiles)
  } else if (stage === 'therest') {
    therest(alignFiles, minimist(process.argv.slice(2)))
  } else {
    throw new Error(`No action specified`)
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
async function annotate(alignFiles: Array<string>) {
  for (let alignFile of alignFiles) {
    let { alignDoc, leftDoc, rigtDoc, leftDocName, rightDocName, leftLang, rightLang } =
      prepareFromAlignment(alignFile)

    if (leftLang === 'cs' || rightLang === 'cs') {
      continue
    }

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
async function therest(alignFiles: Array<string>, params: Dict<string>) {
  console.error(`Gathering morph features from conllus…`)

  let langFeats = new DefaultMap<string, Set<string>>(Set)
  for (let conlluPath of glob.sync(path.join('conllu', '*'))) {
    let lang = conlluPath.match(/\.(\w+)\.xml$/)[1]
    getFeatsFromConllu2(linesSync(conlluPath), langFeats.get(lang))
  }
  let langFeatsArr = buildMap(
    mu(langFeats).map(([lang, set]) => [lang, [...set].sort()] as [string, Array<string>])  // todo
  )

  console.error(`Generating vertical files…`)

  let metaTable = indexTableByColumn(
    parseSeparatedValues(linesSync(params.meta)).toArray(), 'intertext_id')

  let langPairs = new HashSet<Array<string>>()
  for (let alignFile of alignFiles) {
    let { intertextId, leftDoc, rigtDoc, leftDocName, rightDocName, leftLang, rightLang } =
      prepareFromAlignment(alignFile)

    if (leftLang === 'cs' || rightLang === 'cs') {
      continue
    }

    console.error(`processing texts from ${alignFile}`)

    if (!metaTable.has(intertextId)) {
      let message = `Intertext id "${intertextId}" is missing from the meta table`
      // throw new Error(message)
      console.error(message)
      continue
    }
    let metaRecord = metaTable.get(intertextId)
    if (!metaRecord['title_uk']) {
      console.error(`title_uk is missing from ${intertextId} meta`)
    }
    if (!metaRecord['original_language']) {
      let message = `original_language is missing from ${intertextId} meta`
      throw new Error(message)
      // console.error(message)
    }
    // console.error(metaRecord)

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

      let meta = {
        ...subobject(metaRecord, [
          'title_uk',
          'original_language',
          'original_author_uk',
          'translator_uk',
        ]),
        is_original: yesNoUk(metaRecord['original_language'] === lang),
      }
      meta['original_language'] = langMetas.get(meta['original_language']).ukName

      let vertStream = conlluStrAndMeta2vertical(conllu, {
        meta: meta as any,
        featsOrder: langFeatsArr.get(lang as string)
      })
      let sIdx = 0
      let vertLines = mu(vertStream).map(line => {
        if (line === '<s>') {
          return `<s id="${sentIds[sIdx++]}">`
        }
        return line
      }).join('\n', true)

      fs.writeFileSync(destVertical, vertLines, { flag: 'a' })
    }
  }

  console.error(`Generating registry files…`)

  let alignmentSketchDir = 'alignment-sketch'
  let registry = process.env['MANATEE_REGISTRY']
  if (!registry) {
    throw new Error(`MANATEE_REGISTRY env var not set`)
  }
  for (let [lang, alignedLang] of langPairs) {
    let corporaId = `${lang}_${alignedLang}`

    let langMeta = langMetas.get(lang)
    let alignedLangMeta = langMetas.get(alignedLang)
    if (!langMeta || !alignedLangMeta) {
      throw new Error(`Missing lang meta for "${lang}" or "${alignedLangMeta}`)
    }

    let langFeats = langFeatsArr.get(lang)
      .map(x => adaptFeatName(x))

    let abbrs = [langMeta.ukAbbr, alignedLangMeta.ukAbbr]
    if (alignedLangMeta.code === 'uk') {
      abbrs.reverse()
    }
    let registryFile = renderFeatvals({
      name: `${langMeta.ukName} || ${alignedLangMeta.ukNameDat}`,
      path: path.resolve(`${registry}/../manatee/${corporaId}`),
      vertical: path.resolve('vertical', corporaId),
      // infohref: '',
      maintainer: 'org@mova.institute',
      language: langMeta.name,
      encoding: 'utf8',
      locale: `${langMeta.locale}.UTF-8`,
      nonwordre: langMeta.nonwordre,
      // tagsetdoc: '',
      alignstruct: 's',
      aligned: `${alignedLang}_${lang}`,
      aligndef: path.resolve(alignmentSketchDir, corporaId),
    })
    registryFile += firstRegistryPositionals
    registryFile += Mu.chain(
      ['pos'],
      langFeats,
      [
        'tag',
        'sentindex',
        'rel',
        'urel',
        'head',
        'relativehead'
      ],
    )
      .map(x => positionalAttrGeneric(x, {
        multivalue: 'yes',
        multisep: '||',
      }))
      .join('\n', true)
    registryFile += registryStructures
    registryFile += STRUCTURE_G

    fs.writeFileSync(path.join(registry, corporaId), registryFile)
  }

  console.error(`Indexing corpora…`)

  for (let [lang, alignedLang] of langPairs) {
    let corporaId = `${lang}_${alignedLang}`
    console.error(`Indexing ${corporaId}…`)
    execSync(`compilecorp --recompile-corpus --no-ske --no-align ${corporaId}`, {
      // stdio: 'inherit'
    })
  }

  console.error(`Creating unified alignment files…`)

  let alignmentTeiDir = 'alignment-tei'
  mkdirp.sync(alignmentTeiDir)
  for (let [lang, alignedLang] of langPairs) {
    let corporaId = `${lang}_${alignedLang}`
    let dest = path.join(alignmentTeiDir, corporaId)
    // let ws = fs.createWriteStream(dest)
    for (let alignFile of alignFiles) {
      let toWrite = mu(linesSync(alignFile)).filter(x => x.includes(' xtargets='))
      if (alignFile.endsWith(`.${alignedLang}.${lang}.alignment.xml`)) {
        // forward alignment
        console.error(`copying alignment ${alignFile}`)
      } else if (alignFile.endsWith(`.${lang}.${alignedLang}.alignment.xml`)) {
        // reverse alignment
        console.error(`reversing alignment ${alignFile}`)
        toWrite = toWrite.map(reverseAlignmentLine)
      } else {
        continue
      }
      fs.writeFileSync(dest, toWrite.join('\n', true), { flag: 'a' })
    }
  }

  console.error(`Creating indexed alignment files…`)

  mkdirp.sync(alignmentSketchDir)
  for (let [lang, alignedLang] of langPairs) {
    let corporaId = `${lang}_${alignedLang}`
    let dest = path.join(alignmentSketchDir, corporaId)
    let command = `${params.calign} ${corporaId} ${alignedLang}_${lang} s.id ${alignmentTeiDir}/${corporaId}`
      + ` | ${params.fixgaps} | ${params.compressrng} > ${dest}`
    console.error(command)
    execSync(command, {
      // stdio: 'inherit'
    })
  }

  console.error(`Aligning corpora…`)

  mu(langPairs).map(([lang, alignedLang]) => `${lang}_${alignedLang}`)
    .forEach(x => execSync(`compilecorp --no-ske --recompile-align ${x}`, { stdio: 'inherit' }))
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function reverseAlignmentLine(val: string) {
  let [, type, xtargets, rest] = val.match(/^<link type='([^']+)' xtargets='([^']+)'(.*)$/)
  let newType = type.split('-').reverse().join('-')
  let newXtargets = xtargets.split(';').reverse().join(';')

  return `<link type='${newType}' xtargets='${newXtargets}'${rest}`
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function adaptFeatName(val: string) {
  return val.toLowerCase()
    .replace(']', '')
    .replace('[', '_')
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function getFeatsFromConllu2(conllu: Iterable<string>, set = new Set<string>()) {
  for (let line of conllu) {
    let feats = getCol(line, ConlluField.feats)
    if (feats && feats !== '_') {
      feats.split('|')
        .map(x => x.split('=')[0])
        .forEach(x => set.add(x))
    }
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function subobject(from, props: Iterable<string>, filter = (x) => !!x) {
  let ret = {}
  for (let prop of props) {
    if (prop in from && filter(from[prop])) {
      ret[prop] = from[prop]
    }
  }

  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function yesNoUk(val: boolean) {
  return val ? 'так' : 'ні'
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function parseAlignmentPath(alignFilePath: string) {
  return path.basename(alignFilePath)
    .match(/^(.+)\.(\w+)\.(\w+)\.alignment\.xml$/)
    .slice(1)
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function prepareFromAlignment(alignFilePath: string) {
  let [intertextId, leftLang, rightLang] = parseAlignmentPath(alignFilePath)
  let alignDoc = parseXmlFileSync(alignFilePath)
  let linkGrpEl = alignDoc.evaluateElement('//linkGrp')
  let leftDocPath = linkGrpEl.attribute('fromDoc')
  let rightDocPath = linkGrpEl.attribute('toDoc')
  leftDocPath = path.resolve(path.dirname(alignFilePath), leftDocPath)
  rightDocPath = path.resolve(path.dirname(alignFilePath), rightDocPath)
  let leftDoc = parseXmlFileSync(leftDocPath)
  let rigtDoc = parseXmlFileSync(rightDocPath)

  return {
    intertextId,
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
  let pEls = (root.evaluateElements('//p').toArray())
  for (let pEl of pEls) {
    let sentEls = pEl.evaluateElements('.//s').toArray()
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
  return (root.evaluateElements('.//s').toArray())
    .filter(x => x.text().trim())
    .map(x => x.attribute('id'))
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function parseSeparatedValues(lines: Iterable<string>, separator: string | RegExp = '\t') {
  let linesIt = mu(lines)
  let keys = linesIt.first().split(separator)
  return linesIt.map(l => createObject2(keys, l.split(separator)))
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
