#!/usr/bin/env node

import { logErrAndExit, linesSync, writeFileSyncMkdirp } from '../../utils.node'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { parseXmlFileSync } from '../../xml/utils.node'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { conlluStrAndMeta2vertical } from '../tovert'
import { mu, Mu } from '../../mu'

import * as glob from 'glob'
import * as mkdirp from 'mkdirp'
import minimist from 'minimist'

import * as path from 'path'
import * as fs from 'fs'
import { countNumMatches } from '../../string'
import { DefaultMap, HashSet } from '../../data_structures'
import { getCol, ConlluField } from '../../nlp/ud/conllu'
import { buildMap, createObject2 } from '../../lang'
import {
  renderFeatvals,
  STRUCTURE_G,
  positionalAttrGeneric,
} from '../registry_file_builder'
import { indexTableByColumn } from '../../algo'
import { execSync } from 'child_process'
import { Dict } from '../../types'
import { getEndpoint } from '../updipe_api_handles'

//------------------------------------------------------------------------------
const langMetas = indexTableByColumn(
  [
    {
      code: 'uk',
      ukName: 'українська',
      ukNameGen: 'української',
      ukNameDat: 'українській',
      ukNameMasc: 'український',
      ukAbbr: 'укр',
      name: 'Ukrainian',
      locale: 'uk_UA',
      nonwordre:
        '[^АаБбВвГгҐґДдЕеЄєЖжЗзИиІіЇїЙйКкЛлМмНнОоПпРрСсТтУуФфХхЦцЧчШшЩщьЮюЯя’А-Яа-я[:alpha:]].*',
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
      code: 'pt',
      ukName: 'португальська',
      ukNameGen: 'португальської',
      ukNameDat: 'португальській',
      ukNameMasc: 'португальський',
      ukAbbr: 'пор',
      name: 'Portuguese',
      locale: 'pt_PT',
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
      code: 'es',
      ukName: 'іспанська',
      ukNameGen: 'іспанської',
      ukNameDat: 'іспанській',
      ukNameMasc: 'іспанський',
      ukAbbr: 'ісп',
      name: 'Spanish',
      locale: 'es_ES',
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
  ],
  'code',
)

//------------------------------------------------------------------------------
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

const viewParams = `
SHORTREF "=doc.title_uk"
`

//------------------------------------------------------------------------------
async function main() {
  let [stage, alignFilesGlob] = process.argv.slice(2)
  let alignFiles = glob
    .sync(alignFilesGlob)
    .filter((x) => !x.includes('Exupery_Petit-Prince')) // temp

  if (stage === 'annotate') {
    await annotate(alignFiles)
  } else if (stage === 'therest') {
    therest(alignFiles, minimist(process.argv.slice(2)))
  } else {
    throw new Error(`No action specified`)
  }
}

//------------------------------------------------------------------------------
async function annotate(alignFiles: Array<string>) {
  for (let alignFile of alignFiles) {
    let { leftDoc, rigtDoc, leftDocName, rightDocName, leftLang, rightLang } =
      prepareFromAlignment(alignFile)

    if (leftLang === 'cs' || rightLang === 'cs') {
      // belongs to InterCorp
      continue
    }

    let outDir = 'conllu'
    mkdirp.sync('conllu')

    for (let [doc, docName, lang] of [
      [leftDoc, leftDocName, leftLang, rightLang],
      [rigtDoc, rightDocName, rightLang, leftLang],
    ]) {
      let destConllu = path.join(outDir, docName as string)
      if (fs.existsSync(destConllu)) {
        // console.error(`skipping ${docName}: conllu exists`)
        continue
      }
      console.error(`processing "${lang}" of ${alignFile}`)

      // if (!(lang in udpipeApiLangMap)) {
      //   // console.error(`skipping "${lang}": no model set`)
      //   // continue
      //   throw new Error(`no model set for ${lang}`)
      // }
      let { url, model } = getEndpoint(lang as string) // todo
      let udpipe = new UdpipeApiClient(url, model)

      let plaintext = intertextDoc2horizontalPlaintext(doc as AbstractElement)
      let sentIds = getSentIdsFromIntertextDoc(doc as AbstractElement)

      console.error(
        `annotating ${plaintext.length} chars of "${lang}" via "${url}", model "${model}"`,
      )
      try {
        var conllu = await udpipe.tokTagParseHorizontal(plaintext)
      } catch (e) {
        if (e.name === 'StatusCodeError' && e.statusCode === 413) {
          throw e
          // console.error(`request too large`)
          // continue
        } else {
          throw e
        }
      }

      let numSents = countNumMatches(conllu, /^1\t/gm)
      console.error(`  got ${numSents} sents back`)
      if (numSents !== sentIds.length) {
        throw new Error(`numSents !== sentIds.length`)
      }

      fs.writeFileSync(destConllu, conllu)
    }
  }
}

//------------------------------------------------------------------------------
async function therest(alignFiles: Array<string>, params: Dict<string>) {
  const alignmentSketchDir = 'alignment-sketch'

  console.error(`Gathering morph features from conllus…`)
  let featsInLang = buildLangFetureMap()

  console.error(`Generating vertical files…`)

  let meta = buildMeta(linesSync(params.meta))

  let langPairs = new HashSet<Array<string>>()
  for (let alignFile of alignFiles) {
    let {
      intertextId,
      leftDoc,
      rigtDoc,
      leftDocName,
      rightDocName,
      leftLang,
      rightLang,
    } = prepareFromAlignment(alignFile)

    if (leftLang === 'cs' || rightLang === 'cs') {
      continue
    }

    console.error(`verticalizing texts from ${alignFile}`)

    if (!meta.has(intertextId)) {
      console.error(`Missing meta, skipping!`)
      continue
    }

    let compositionMeta = meta.get(intertextId)
    try {
      checkMetaIsSane(meta, intertextId)
    } catch (e) {
      // console.error(e)
      // continue
      throw e
    }

    for (let [doc, docName, lang, oppositeLang] of [
      [leftDoc, leftDocName, leftLang, rightLang],
      [rigtDoc, rightDocName, rightLang, leftLang],
    ]) {
      let conllu = fs.readFileSync(
        path.join('conllu', docName as string),
        'utf8',
      )
      let sentIds = getSentIdsFromIntertextDoc(doc as AbstractElement)
      let outDir = 'vertical'
      mkdirp.sync(outDir)
      langPairs.add([lang as string, oppositeLang as string])
      let corporaId = `${lang}_${oppositeLang}`
      let destVertical = path.join(outDir, corporaId)

      let textMeta = compositionMeta.texts.get(lang as string)
      let docMeta = {
        title_uk: compositionMeta.originalText.title_uk,
        original_language: compositionMeta.originalText.language,
        is_original: yesNoUk(
          compositionMeta.originalText.language === textMeta.language,
        ),
        translator_uk: textMeta.translator_uk,
        original_author_uk: compositionMeta.originalText.original_author_uk,
      }
      // console.error(docMeta)

      if (docMeta['original_language']) {
        docMeta['original_language'] = langMetas.get(
          docMeta['original_language'],
        ).ukName
      }

      let vertStream = conlluStrAndMeta2vertical(conllu, {
        meta: docMeta as any,
        featsOrder: featsInLang.get(lang as string),
      })
      let sIdx = 0
      let vertLines = mu(vertStream)
        .map((line) => {
          if (line === '<s>') {
            return `<s id="${sentIds[sIdx++]}">`
          }
          return line
        })
        .join('\n', true)

      fs.writeFileSync(destVertical, vertLines, { flag: 'a' })
    }
  }

  let corpora = mu(langPairs)
    .map(([lang, alignedLang]) => ({
      lang,
      alignedLang,
      corpusId: `${lang}_${alignedLang}`,
    }))
    .toArray()

  console.error(`Generating registry files…`)

  for (let { lang, alignedLang, corpusId } of corpora) {
    let registryFileStr = buildRegistry(
      lang,
      alignedLang,
      featsInLang,
      'registry',
      alignmentSketchDir,
    )
    writeFileSyncMkdirp(path.join('registry', corpusId), registryFileStr)
  }

  console.error(`Indexing corpora…`)

  fs.mkdirSync('manatee', { recursive: true })
  for (let { corpusId } of corpora) {
    console.error(`Indexing ${corpusId}…`)
    execSync(
      `MANATEE_REGISTRY="registry" compilecorp --recompile-corpus --no-ske --no-align ${corpusId}`,
      {
        // stdio: 'inherit',
      },
    )
  }

  console.error(`Creating unified alignment files…`)

  let alignmentTeiDir = 'alignment-tei'
  mkdirp.sync(alignmentTeiDir)
  for (let { lang, alignedLang, corpusId } of corpora) {
    let dest = path.join(alignmentTeiDir, corpusId)
    // let ws = fs.createWriteStream(dest)
    for (let alignFile of alignFiles) {
      let toWrite = mu(linesSync(alignFile)).filter((x) =>
        x.includes(' xtargets='),
      )
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
  for (let { lang, alignedLang, corpusId } of corpora) {
    let dest = path.join(alignmentSketchDir, corpusId)
    let command =
      `${params.calign} ${corpusId} ${alignedLang}_${lang} s.id ${alignmentTeiDir}/${corpusId}` +
      ` | ${params.fixgaps} | ${params.compressrng} > ${dest}`
    console.error(command)
    execSync(command, {
      // stdio: 'inherit'
    })
  }

  console.error(`Aligning corpora…`)

  corpora.forEach(({ corpusId }) =>
    execSync(
      `MANATEE_REGISTRY="registry" compilecorp --no-ske --recompile-align ${corpusId}`,
    ),
  )
}

//------------------------------------------------------------------------------
interface MetaTableRecord {
  intertext_id: string
  title_uk: string
  language: string
  is_original: string
  original_author_uk: string
  original_author_native: string
  translator_uk: string
}

//------------------------------------------------------------------------------
interface Text {
  language: string
  is_original: string
  original_author_uk: string
  original_author_native: string
  translator_uk: string
  title_uk: string
}

//------------------------------------------------------------------------------
class Title {
  texts = new DefaultMap<string, Text>(Object as any)

  get originalText() {
    return mu(this.texts.values()).find((x) => x.is_original === '1')
  }
}

//------------------------------------------------------------------------------
function buildMeta(tsvLines: Iterable<string>) {
  let tsv = parseSeparatedValues<MetaTableRecord>(tsvLines).toArray()
  let titles = new DefaultMap<string, Title>(Title)
  for (let record of tsv) {
    let title = titles.get(record.intertext_id)
    let isOldStyleRow = /^\w\w$/.test(record.is_original)
    if (isOldStyleRow) {
      let original = {
        ...record,
        language: record.is_original,
        is_original: '1',
      }
      let translation = { ...record, is_original: '0' }
      title.texts.set(original.language, original)
      title.texts.set(translation.language, translation)
    } else {
      title.texts.set(record.language, record)
    }
  }
  return titles
}

//------------------------------------------------------------------------------
function reverseAlignmentLine(val: string) {
  let [, type, xtargets, rest] = val.match(
    /^<link type='([^']+)' xtargets='([^']+)'(.*)$/,
  )
  let newType = type.split('-').reverse().join('-')
  let newXtargets = xtargets.split(';').reverse().join(';')

  return `<link type='${newType}' xtargets='${newXtargets}'${rest}`
}

//------------------------------------------------------------------------------
function adaptFeatName(val: string) {
  return val.toLowerCase().replace(']', '').replace('[', '_')
}

//------------------------------------------------------------------------------
function getFeatsFromConllu2(
  conllu: Iterable<string>,
  set = new Set<string>(),
) {
  for (let line of conllu) {
    let feats = getCol(line, ConlluField.feats)
    if (feats && feats !== '_') {
      feats
        .split('|')
        .map((x) => x.split('=')[0])
        .forEach((x) => set.add(x))
    }
  }
}

//------------------------------------------------------------------------------
function subobject<T>(
  from: T,
  props: Iterable<keyof T>,
  filter = (x) => Boolean(x),
) {
  let ret = {}
  for (let prop of props) {
    if (prop in from && filter(from[prop])) {
      ret[prop as string] = from[prop]
    }
  }

  return ret
}

//------------------------------------------------------------------------------
function yesNoUk(val: boolean) {
  return val ? 'так' : 'ні'
}

//------------------------------------------------------------------------------
function parseAlignmentPath(alignFilePath: string) {
  return path
    .basename(alignFilePath)
    .match(/^(.+)\.(\w+)\.(\w+)\.alignment\.xml$/)
    .slice(1)
}

//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
function intertextDoc2horizontalPlaintext(root: AbstractElement) {
  let ret = ''
  // let ids = new Array<string>()
  let pEls = root.evaluateElements('//p').toArray()
  for (let pEl of pEls) {
    let sentEls = pEl.evaluateElements('.//s').toArray()
    if (!sentEls.length) {
      continue
    }
    // ids.push(...sentEls.map(x => x.attribute('id')))
    ret += sentEls.map((x) => x.text().replace(/[\r\t\n]+/g, ' ')).join('\n')
    ret += '\n\n'
  }

  return ret
}

//------------------------------------------------------------------------------
function getSentIdsFromIntertextDoc(root: AbstractElement) {
  return root
    .evaluateElements('.//s')
    .toArray()
    .filter((x) => x.text().trim())
    .map((x) => x.attribute('id'))
}

//------------------------------------------------------------------------------
function parseSeparatedValues<T>(
  lines: Iterable<string>,
  separator: string | RegExp = '\t',
) {
  let linesIt = mu(lines)
  let keys = linesIt.first().split(separator)
  return linesIt.map((l) =>
    createObject2(
      keys,
      l.split(separator).map((x) => x.trim()),
    ),
  ) as Mu<T>
}

//------------------------------------------------------------------------------
function buildLangFetureMap() {
  let langToFeats = new DefaultMap<string, Set<string>>(Set)
  for (let conlluPath of glob.sync(path.join('conllu', '*'))) {
    let lang = conlluPath.match(/\.(\w+)\.xml$/)[1]
    getFeatsFromConllu2(linesSync(conlluPath), langToFeats.get(lang))
  }
  return buildMap(
    mu(langToFeats).map(
      ([lang, set]) => [lang, [...set].sort()] as [string, Array<string>],
    ), // todo
  )
}

//------------------------------------------------------------------------------
function checkMetaIsSane(meta: DefaultMap<string, Title>, intertextId: string) {
  if (!meta.has(intertextId)) {
    let message = `Intertext id "${intertextId}" is missing from the meta table`
    throw new Error(message)
    // console.error(message)
    // continue
  }
  let titleMeta = meta.get(intertextId)
  if (!titleMeta) {
    let message = `title_uk is missing from ${intertextId} meta`
    // console.error(message)
    throw new Error(message)
  }
  if (!titleMeta.originalText.language) {
    let message = `original_language is missing from ${intertextId} meta`
    throw new Error(message)
    console.error(message)
  }
}

//------------------------------------------------------------------------------
function buildRegistry(
  lang: string,
  alignedLang: string,
  featsInLang: Map<string, Array<string>>,
  registryDir: string,
  alignmentSketchDir: string,
) {
  let corporaId = `${lang}_${alignedLang}`

  let langMeta = langMetas.get(lang)
  let alignedLangMeta = langMetas.get(alignedLang)
  if (!langMeta || !alignedLangMeta) {
    throw new Error(`Missing lang meta for "${lang}" or "${alignedLangMeta}`)
  }

  let langFeats = featsInLang.get(lang).map((x) => adaptFeatName(x))

  // let abbrs = [langMeta.ukAbbr, alignedLangMeta.ukAbbr]
  // if (alignedLangMeta.code === 'uk') {
  //   abbrs.reverse()
  // }
  let ret = renderFeatvals({
    name: `${langMeta.ukName} || ${alignedLangMeta.ukNameDat}`,
    path: path.resolve(`${registryDir}/../manatee/${corporaId}`),
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
  ret += firstRegistryPositionals
  ret += Mu.chain(['pos'], langFeats, [
    'tag',
    'sentindex',
    'rel',
    'urel',
    'head',
    'relativehead',
  ])
    .map((x) =>
      positionalAttrGeneric(x, {
        multivalue: 'yes',
        multisep: '||',
      }),
    )
    .join('\n', true)
  ret += registryStructures
  ret += STRUCTURE_G
  ret += viewParams

  return ret
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}
