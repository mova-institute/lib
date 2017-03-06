#!/usr/bin/env node --max-old-space-size=7000 --expose-gc

import { basename, join, dirname } from 'path'
import * as fs from 'fs'
import * as path from 'path'
import { existsSync, openSync, closeSync, writeSync } from 'fs'

import { sync as globSync } from 'glob'
import { sync as mkdirpSync } from 'mkdirp'
import { parseHtmlString } from 'libxmljs'
import { LibxmljsDocument } from 'xmlapi-libxmljs'
import * as minimist from 'minimist'

import { CorpusDoc } from './doc_meta'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { keyvalue2attributesNormalized } from '../xml/utils'
import { writeFileSyncMkdirp, openSyncMkdirp } from '../utils.node'
import { parseXmlFileSync } from '../xml/utils.node'
import { parseUmolodaArticle } from './parsers/umoloda'
import { parseDztArticle } from './parsers/dzt'
import { parseDenArticle } from './parsers/den'
import { parseZbrucArticle } from './parsers/zbruc'
import { parseTyzhdenArticle } from './parsers/tyzhden'
import { buildMiteiVertical } from './mitei_build_utils'
import { streamChtyvo } from './parsers/chtyvo'
import { trimExtension } from '../string_utils'
import { StanfordTaggerClient } from '../nlp/stanford_tagger_client'
import * as nlpUtils from '../nlp/utils'
import * as nlpStatic from '../nlp/static'
import {
  tokenizeTei, tei2tokenStream, token2sketchVertical, morphInterpret,
  normalizeCorpusTextString, polishXml2verticalStream,
} from '../nlp/utils'
import { mu, Mu } from '../mu'
import { uniq } from '../algo'



interface Args {
  workspace: string
  part: string
  mitei?: string

  tempgeneric: boolean
  inputGlob: string
  inputRoot: string
}



const partName2function = {
  umoloda,
  dzt,
  kontrakty,
  den,
  zbruc,
  tyzhden,
  chtyvo,
  mitei,
  parallel: buildUkParallelSide,
  en: buildEnglish,
  pl: buildPolish,
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      workspace: ['ws'],
    },
    default: {
      workspace: '.',
    },
    boolean: [
      'tempgeneric'
    ]
  }) as any

  main(args)
}

interface SpecificModule {
  streamDocs(inputStr: string): Iterable<CorpusDoc>
}

//------------------------------------------------------------------------------
function main(args: Args) {
  if (args.tempgeneric) {
    let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(false).setKeepN2adj(true)

    let outDir = join(args.workspace, 'build', args.part)
    let inputGlob = join(args.inputRoot, args.inputGlob)
    console.log(`globbing input files: ${inputGlob}`)
    let inputFiles = globSync(inputGlob, { nodir: true, nosort: true })
    console.log(`globbed ${inputFiles.length} files`)

    mkdirpSync(outDir)
    fs.appendFileSync(join(outDir, 'commands.txt'), process.argv.join(' ') + '\n')

    let specificModule = require(`./parsers/${args.part}`) as SpecificModule
    for (let filePath of inputFiles) {
      let relPath = path.relative(args.inputRoot, filePath)
      let jsonPath = join(outDir, 'json', `${relPath}.json`)
      if (fs.existsSync(jsonPath)) {
        continue
      }
      console.log(`parsing ${filePath}`)

      let fileStr = fs.readFileSync(filePath, 'utf8')
      let parsedDocs = [...specificModule.streamDocs(fileStr)]

      parsedDocs = parsedDocs.filter(doc => {
        if (!doc.paragraphs || !doc.paragraphs.length) {
          console.error('missing paragraphs ✖️')
          return false
        }
        if (!doc.date) {
          console.error(`no date ✖️`)
          return false
        }
        if (!isConsideredUkrainan(doc.paragraphs, analyzer)) {
          console.error(`considered foreign ✖️  ${doc.paragraphs[0].substr(0, 20)} ${doc.url}`)
          return false
        }
        return true
      })

      // console.log(parsedDocs)
      writeFileSyncMkdirp(jsonPath, JSON.stringify(parsedDocs, undefined, 2))

      let forvecPath = join(outDir, '4vec', `${relPath}.4vec`)
      let tempout = openSyncMkdirp(forvecPath, 'w')
      for (let parsedDoc of parsedDocs) {
        // add title to the body
        // if (parsedDoc.paragraphs.length && parsedDoc.paragraphs[0] !== parsedDoc.title) {
        //   parsedDoc.paragraphs = [parsedDoc.title, ...parsedDoc.paragraphs]
        // }

        for (let paragraph of parsedDoc.paragraphs) {
          let towrite = mu(nlpUtils.tokenizeUk(paragraph, analyzer))
            .map(({ token }) => token.trim())
            .filter(token => token && !nlpStatic.ANY_PUNC_OR_DASH_RE.test(token))
            .join(' ')
          fs.writeSync(tempout, towrite + '\n')
        }
      }
      fs.closeSync(tempout)
    }
  } else {
    mainOld(args)
  }
}

//------------------------------------------------------------------------------
function isConsideredUkrainan(paragraphs: string[], analyzer: MorphAnalyzer) {
  const THRESHOLD = 0.2

  let tokensChecked = 0
  let numX = 0
  for (let i = paragraphs.length - 1; i >= 0; --i) {
    let tokens = nlpUtils.tokenizeUk(paragraphs[i], analyzer)
    numX += tokens.filter(({ token }) => !analyzer.tag(token).filter(x => !x.isX()).length)
      .length
    tokensChecked += tokens.length
    if (tokensChecked >= 30) {
      return numX / tokensChecked < THRESHOLD
    }
  }

  if (tokensChecked) {
    if (tokensChecked < 6) {
      if (paragraphs.some(p => /їєґі/.test(p))) {
        return true
      }
      if (paragraphs.some(p => /ыэёъ/.test(p))) {
        return false
      }
    }
    return numX / tokensChecked < THRESHOLD
  }
}

//------------------------------------------------------------------------------
function mainOld(args: Args) {
  // console.log(args.part)
  // process.exit(0)
  let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(false).setKeepN2adj(true)
  // let verticalFile = createVerticalFile(args.workspace, args.part)
  let func = partName2function[args.part]
  func(args.workspace, analyzer, args)
}

//------------------------------------------------------------------------------
function umoloda(workspacePath: string, analyzer: MorphAnalyzer) {
  let verticalFile = rotateAndOpen(join(workspacePath, `build/ umoloda.vrt.txt`))
  let articlePathsGlob = join(workspacePath, 'data/umoloda/fetched_articles/*.html')
  let articlePaths = globSync(articlePathsGlob).sort(umolodaFilenameComparator)
  for (let path of articlePaths) {
    let [a, b, c] = trimExtension(basename(path)).split('_')
    console.log(`processing umoloda article ${a}_${b}_${c}`)

    let html = fs.readFileSync(path, 'utf8')
    let { title, author, paragraphs, date } = parseUmolodaArticle(html, htmlDocCreator)

    if (!paragraphs.length) {  // some empty articles happen
      continue
    }

    date = date.split('.').reverse().join('–')
    let meta = {
      // publisher: 'Україна молода',
      // proofread: '✓',
      url: `http://www.umoloda.kiev.ua/number/${a}/${b}/${c}/`,
      author,
      title,
      reference_title: title ? `УМ:${title}` : `УМ`,
      date,
      type: 'публіцистика',
    }
    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function chtyvo(workspacePath: string, analyzer: MorphAnalyzer) {
  console.log(`Now bulding chtyvo`)
  let buildDir = join(workspacePath, 'build', 'chtyvo', 'vrt')
  let dataRootDir = join(workspacePath, 'data', 'chtyvo')
  let metas = globSync(join(dataRootDir, '**', '*.meta.html'))
  for (let i = 0; i < metas.length; ++i) {
    let base = metas[i].slice(0, -'.meta.html'.length)
    let dest = path.relative(dataRootDir, base) + '.vrt.txt'
    dest = path.join(buildDir, dest)
    if (fs.existsSync(dest)) {
      continue
    }
    let doc = mu(streamChtyvo(base, analyzer))
      .map(x => nlpUtils.token2sketchVertical(x))
      .join('\n') + '\n'
    if (doc) {
      mkdirpSync(path.dirname(dest))
      fs.writeFileSync(dest, doc)
    }
  }
  // global.gc()
  // global.gc()
}

//------------------------------------------------------------------------------
async function buildUkParallelSide(workspacePath: string, analyzer: MorphAnalyzer) {
  console.log(`Now bulding Ukrainian side of parallel corpora`)

  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/**/*'))
  // let plFiles = globSync(join(workspacePath, 'data', 'parallel/pl_tagged_renamed/*'))

  // .filter(x => x.endsWith('.uk.xml'))
  let enFiles = srcFiles.filter(
    x => x.endsWith('.uk.xml') && srcFiles.find(xx => xx === x.slice(0, -7) + '.en.xml'))
  let plFiles = srcFiles.filter(
    x => x.endsWith('.uk.xml') && srcFiles.find(xx => xx.includes('.pl.') && xx.startsWith(x.slice(0, -7))))
  // console.error(plFiles)
  // return
  // srcFiles = selectFilesForLang(srcFiles, 'uk')
  srcFiles = uniq([...enFiles, ...plFiles])
  let buildDir = join(workspacePath, 'build', 'parallel')
  mkdirpSync(buildDir)
  let verticalFilePath = join(buildDir, 'vrt.txt')
  let verticalFile = rotateAndOpen(verticalFilePath)

  for (let path of srcFiles) {
    console.log(`processing ${path}`)
    let root = parseXmlFileSync(path)
    root.evaluateNodes('//text()')
      .forEach(x => x.text(normalizeCorpusTextString(x.text(), analyzer)))
    root.evaluateNodes('//s')
      .filter(x => !x.text().trim())
      .forEach(x => x.remove() && console.log('rm'))
    tokenizeTei(root, analyzer)
    morphInterpret(root, analyzer)
    writeSync(verticalFile, `<doc reference_title="${basename(path).slice(0, -'.uk.xml'.length)}">\n`)
    mu(tei2tokenStream(root))
      .map(x => token2sketchVertical(x))
      .chunk(3000)
      .forEach(x => writeSync(verticalFile, x.join('\n') + '\n'))
    writeSync(verticalFile, `</doc>\n`)
  }
}

//------------------------------------------------------------------------------
function selectFilesForLang(files: string[], lang: string) {
  return files.filter(x => x.endsWith('.alignment.xml') && x.includes(`.${lang}.`))
    .sort()
    .map(x => x.slice(0, -'xx.alignment.xml'.length) + 'xml')
}

//------------------------------------------------------------------------------
function buildPolish(workspacePath: string) {
  console.log(`Now bulding Polish`)
  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/pl_tagged_renamed/**/*.xml'))
    .filter(x => x.endsWith('.pl.xml'))
    .sort()
  // srcFiles = selectFilesForLang(srcFiles, 'pl')
  let buildDir = join(workspacePath, 'build', 'pl')
  let verticalFilePath = join(buildDir, 'vrt.txt')
  let verticalFile = rotateAndOpen(verticalFilePath)
  let lines = new Array<string>()
  for (let path of srcFiles) {
    console.log(`processing ${basename(path)}`)
    let doc = parseXmlFileSync(path)
    lines.push(`<doc reference_title="${basename(path).slice(0, -'.xml'.length).trim()}">`)
    mu(polishXml2verticalStream(doc)).forEach(x => lines.push(x))
    lines.push(`</doc>`)
    let toWrite = lines.join('\n') + '\n'
    toWrite = toWrite.replace(/<s[^>]*>[\s]*<\/s>/g, '')
    writeSync(verticalFile, toWrite)
    lines = []
  }
  closeSync(verticalFile)
}

//------------------------------------------------------------------------------
async function buildEnglish(workspacePath: string) {
  /*
  java -mx900m -cp 'stanford-postagger.jar:lib/*' \
  edu.stanford.nlp.tagger.maxent.MaxentTaggerServer \
  -port 8088 -model models/english-left3words-distsim.tagger \
  -outputFormat xml -sentenceDelimiter newline -outputFormatOptions lemmatize
  */
  console.log(`Now bulding English`)

  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/**/*'))
  srcFiles = selectFilesForLang(srcFiles, 'en')
  // .filter(x => x.endsWith('.en.xml'))
  let buildDir = join(workspacePath, 'build', 'en')
  let verticalFilePath = join(buildDir, 'vrt.txt')
  let verticalFile = rotateAndOpen(verticalFilePath)
  let tagger = new StanfordTaggerClient(8088)
  for (let path of srcFiles) {
    console.log(`processing ${basename(path)}`)
    let lines = new Array<string>()
    lines.push(`<doc reference_title="${basename(path).slice(0, -'.en.xml'.length)}">`)
    for (let p of parseXmlFileSync(path).evaluateElements('//p')) {
      lines.push(`<p id="${p.attribute('id')}">`)
      for (let s of p.evaluateElements('./s')) {
        let text = s.text().trim()
        if (!text) {
          continue
        }
        lines.push(`<s id="${s.attribute('id')}">`)
        let tagged = await tagger.tag(text)
        // console.log(tagged)
        lines.push(...tagged.map(x => x.join('\t')))
        lines.push(`</s>`)
      }
      lines.push(`</p>`)
    }
    lines.push(`</doc>`)
    writeSync(verticalFile, lines.join('\n') + '\n')
  }
  closeSync(verticalFile)

  // console.log(`Now bulding id2i for English`)
  // let wstream = createWriteStream(join(buildDir, 'id2i.txt'))
  // await id2i(createReadStream(verticalFilePath), wstream)
  // wstream.close()
}

//------------------------------------------------------------------------------
function den(workspacePath: string, analyzer: MorphAnalyzer) {
  let verticalFile = rotateAndOpen(join(workspacePath, `build/den.vrt.txt`))
  let articlePathsGLob = join(workspacePath, 'data/den/fetched_articles/*/**/*.html')
  let articlePaths = globSync(articlePathsGLob)

  for (let path of articlePaths) {
    console.log(`processing den article ${trimExtension(basename(path))}`)

    try {
      let html = fs.readFileSync(path, 'utf8')
      var { author, date, paragraphs, title, url, valid } = parseDenArticle(html, htmlDocCreator)
    } catch (e) {
      console.error(`Error: ${e.message}`)
      continue
    }
    if (!valid) {
      continue
    }

    let meta = {
      // publisher: 'День',
      // proofread: '✓',
      url,
      author,
      title,
      reference_title: `Д.: ${title}`,
      date,
      type: 'публіцистика',
    }
    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function tyzhden(workspacePath: string, analyzer: MorphAnalyzer) {
  let verticalFile = rotateAndOpen(join(workspacePath, 'build', 'tyzhden.vrt.txt'))
  let articlePathsGLob = join(workspacePath, 'data/tyzhden/html/**/*.html')
  let articlePaths = globSync(articlePathsGLob, { nosort: true })
    .sort((a, b) => Number(trimExtension(basename(a))) - Number(trimExtension(basename(b))))

  for (let path of articlePaths) {
    try {
      let html = fs.readFileSync(path, 'utf8')
      var { author, date, paragraphs, title, url, isValid } = parseTyzhdenArticle(html, htmlDocCreator)
    } catch (e) {
      console.error(`Error: ${e.stack}`)
      continue
    }
    if (!isValid) {
      continue
    }
    console.log(`processing tyzhden article ${url}`)

    let meta = {
      // publisher: 'Тиждень',
      // proofread: '✓',
      url,
      author,
      title,
      reference_title: `Т.: ${title}`,
      date,
      type: 'публіцистика',
    }

    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function zbruc(workspacePath: string, analyzer: MorphAnalyzer) {
  let verticalFile = rotateAndOpen(join(workspacePath, `build/zbruc.vrt.txt`))
  let articlePathsGLob = join(workspacePath, 'data/zbruc/fetched_articles/**/*.html')
  let articlePaths = globSync(articlePathsGLob)

  for (let path of articlePaths) {
    try {
      let html = fs.readFileSync(path, 'utf8')
      var { author, date, paragraphs, title, url, isValid } = parseZbrucArticle(html, htmlDocCreator)
    } catch (e) {
      console.error(`Error: ${e.message}`)
      continue
    }
    if (!isValid) {
      continue
    }
    console.log(`processing zbruc article ${trimExtension(basename(path))}`)

    let meta = {
      reference_title: `Збруч: ${title}`,
      title,
      url,
      author,
      date,
      type: 'публіцистика',
    }

    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function dzt(workspacePath: string, analyzer: MorphAnalyzer) {
  let verticalFile = rotateAndOpen(join(workspacePath, 'build', 'dzt.vrt.txt'))
  let articlePathsGLob = join(workspacePath, 'data/dzt/fetched_articles/**/*.html')
  let articlePaths = globSync(articlePathsGLob)  // todo: sort by date

  for (let path of articlePaths) {
    console.log(`processing dzt article ${trimExtension(basename(path))}`)

    let html = fs.readFileSync(path, 'utf8')
    let { title, author, paragraphs, datetime, url } = parseDztArticle(html, htmlDocCreator)

    if (!paragraphs.length) {  // some empty articles happen
      continue
    }

    let meta = {
      // publisher: 'Дзеркало тижня',
      // proofread: '✓',
      url,
      author,
      title,
      reference_title: `ДТ.: ${title}`,
      date: datetime,
      type: 'публіцистика',
    }

    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function kontrakty(workspacePath: string, analyzer: MorphAnalyzer) {
  let verticalFile = rotateAndOpen(join(workspacePath, 'build', 'kontrakty.vrt.txt'))
  let files = globSync(join(workspacePath, 'data/kontrakty') + '/*.txt')
  for (let file of files) {
    console.log(`processsing ${basename(file)}…`)
    let year = Number.parseInt(basename(file).replace(/\.txt$/, ''))
    let contents = fs.readFileSync(file, 'utf8')
    contents = nlpUtils.normalizeCorpusTextString(contents)

    let stream = nlpUtils.string2tokenStream(contents, analyzer)
      .map(x => nlpUtils.token2sketchVertical(x))
      .chunk(10000)

    let meta = {
      // publisher: 'Галицькі контракти',
      title: `Контракти ${year}`,
      reference_title: `Контракти ${year}`,
      date: year,
      type: 'публіцистика',
    }
    fs.writeSync(verticalFile, `<doc ${keyvalue2attributesNormalized(meta)}>\n`)
    stream.forEach(x => fs.writeSync(verticalFile, x.join('\n') + '\n'))
    fs.writeSync(verticalFile, `</doc>\n`)
  }
}

//------------------------------------------------------------------------------
function writeDocMetaAndParagraphs(meta: any, paragraphs: string[], analyzer: MorphAnalyzer, verticalFile: number) {
  fs.writeSync(verticalFile, `<doc ${keyvalue2attributesNormalized(meta)}>\n`)
  for (let p of paragraphs) {
    fs.writeSync(verticalFile, '<p>\n')
    let stream = nlpUtils.string2tokenStream(p, analyzer)
      .map(x => nlpUtils.token2sketchVertical(x))
      .chunk(10000)
    stream.forEach(x => fs.writeSync(verticalFile, x.join('\n') + '\n'))
    fs.writeSync(verticalFile, '</p>\n')
  }
  fs.writeSync(verticalFile, `</doc>\n`)
}

//------------------------------------------------------------------------------
function umolodaFilenameComparator(a: string, b: string) {
  return Number(trimExtension(basename(a)).split('_')[2]) -
    Number(trimExtension(basename(b)).split('_')[2])
}

//------------------------------------------------------------------------------
function htmlDocCreator(html: string) {
  return new LibxmljsDocument(parseHtmlString(html))
}

//------------------------------------------------------------------------------
function rotateAndOpen(filePath: string) {
  let dir = dirname(filePath)
  let base = basename(filePath)
  mkdirpSync(dir)
  if (existsSync(filePath)) {
    for (let i = 0; ; ++i) {
      let newPath = join(dir, `${i}.${base}`)
      if (!existsSync(newPath)) {
        fs.renameSync(filePath, newPath)
        return openSync(filePath, 'w')
      }
    }
  } else {
    return openSync(filePath, 'w')  // todo: why both?
  }
}

//------------------------------------------------------------------------------
function mitei(workspacePath: string, analyzer: MorphAnalyzer, args: Args) {
  let verticalFile = rotateAndOpen(join(workspacePath, 'build', 'mitei.vrt.txt'))
  buildMiteiVertical(args.mitei, analyzer, verticalFile)
}
