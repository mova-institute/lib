#!/usr/bin/env node  --max-old-space-size=5120

import { basename, join, dirname } from 'path'
import * as fs from 'fs'
import { existsSync, openSync, closeSync, writeSync, createReadStream, createWriteStream } from 'fs'

import { sync as globSync } from 'glob'
import { sync as mkdirpSync } from 'mkdirp'
import { parseHtmlString } from 'libxmljs'
import { LibxmljsDocument } from 'xmlapi-libxmljs'
import * as minimist from 'minimist'

import { id2i } from './id2i'
import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { keyvalue2attributesNormalized } from '../xml/utils'
import { parseXmlFileSync } from '../xml/utils.node'
import { parseUmolodaArticle } from '../nlp/parsers/umoloda'
import { parseDztArticle } from '../nlp/parsers/dzt'
import { parseDenArticle } from '../nlp/parsers/den'
import { parseZbrucArticle } from '../nlp/parsers/zbruc'
import { parseTyzhdenArticle } from '../nlp/parsers/tyzhden'
import { buildMiteiVertical } from './mitei_build_utils'
import { streamChtyvo } from '../nlp/parsers/chtyvo'
import { trimExtension } from '../string_utils'
import { StanfordTaggerClient } from '../nlp/stanford_tagger_client'
import * as nlpUtils from '../nlp/utils'
import {
  tokenizeTei, tei2tokenStream, token2sketchVertical, morphInterpret,
  normalizeCorpusTextString,
} from '../nlp/utils'
import { mu } from '../mu'



interface Args {
  workspace: string
  part: string
  mitei?: string
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
  en: buildEnglish,
  parallel: buildUkParallelSide,
}

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      workspace: ['ws'],
    },
    default: {
      workspace: '.',
    },
  }) as any

  main(args)
}

//------------------------------------------------------------------------------
function main(args: Args) {
  let analyzer = createMorphAnalyzerSync().setExpandAdjectivesAsNouns(false).setKeepN2adj(true)
  let verticalFile = createVerticalFile(args.workspace, args.part)
  let func = partName2function[args.part]
  func(args.workspace, analyzer, verticalFile, args)
}

//------------------------------------------------------------------------------
function umoloda(workspacePath: string, analyzer: MorphAnalyzer, verticalFile: number) {
  let articlePathsGlob = join(workspacePath, 'umoloda/fetched_articles/*.html')
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
      text_type: 'публіцистика',
    }
    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function chtyvo(workspacePath: string, analyzer: MorphAnalyzer) {
  console.log(`Now bulding chtyvo`)
  let buildDir = join(workspacePath, 'build')
  // if (existsSync(verticalDir)) {
  //   console.log(`Skipping: ${verticalDir} exists`)
  //   return
  // }
  let verticalFile = rotateAndOpen(join(buildDir, 'chtyvo.vertical.txt'))
  mu(streamChtyvo(join(workspacePath, 'data', 'chtyvo'), analyzer))
    .map(x => nlpUtils.token2sketchVertical(x))
    .chunk(10000)
    .forEach(x => fs.writeSync(verticalFile, x.join('\n') + '\n'))
  closeSync(verticalFile)
}

//------------------------------------------------------------------------------
async function buildUkParallelSide(workspacePath: string, analyzer: MorphAnalyzer) {
  console.log(`Now bulding Ukrainian side of parallel corpora`)

  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/**/*'))
    .filter(x => x.endsWith('.uk.xml'))
  let buildDir = join(workspacePath, 'build', 'parallel')
  mkdirpSync(buildDir)
  let verticalFilePath = join(buildDir, 'parallel.vertical.txt')
  let verticalFile = rotateAndOpen(verticalFilePath)

  for (let path of srcFiles) {
    console.log(`processing ${path}`)
    let root = parseXmlFileSync(path)
    root.evaluateNodes('//text()').forEach(
      x => x.text(normalizeCorpusTextString(x.text(), analyzer)))
    // normalizeCorpusText(root, analyzer)
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
async function buildEnglish(workspacePath: string) {
  /*
  java -mx900m -cp 'stanford-postagger.jar:lib/*' \
  edu.stanford.nlp.tagger.maxent.MaxentTaggerServer \
  -port 8088 -model models/english-left3words-distsim.tagger \
  -outputFormat xml -sentenceDelimiter newline -outputFormatOptions lemmatize
  */
  console.log(`Now bulding English`)

  let srcFiles = globSync(join(workspacePath, 'data', 'parallel/**/*'))
    .filter(x => x.endsWith('.en.xml'))
  let buildDir = join(workspacePath, 'build', 'en')
  mkdirpSync(buildDir)
  let verticalFilePath = join(buildDir, 'en.vertical.txt')
  if (existsSync(verticalFilePath)) {
    console.log(`Skipping vertical file built, ${verticalFilePath}`)
  } else {
    let verticalFile = openSync(verticalFilePath, 'w')
    let tagger = new StanfordTaggerClient(8088)

    for (let path of srcFiles) {
      console.log(`processing ${basename(path)}`)
      let lines = new Array<string>()
      // console.log(`processing ${path}`)
      lines.push(`<doc reference_title="${basename(path).slice(0, -'.en.xml'.length)}">`)
      for (let p of parseXmlFileSync(path).evaluateElements('//p')) {
        lines.push(`<p id="${p.attribute('id')}">`)
        // console.log(`### ${p.attribute('id')}`)
        for (let s of p.evaluateElements('./s')) {
          // console.log(s.attribute('id'))
          lines.push(`<s id="${s.attribute('id')}">`)
          let tagged = await tagger.tag(s.text())
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
  }

  console.log(`Now bulding id2i for English`)
  let wstream = createWriteStream(join(buildDir, 'id2i.txt'))
  await id2i(createReadStream(verticalFilePath), wstream)
  wstream.close()
}

//------------------------------------------------------------------------------
function den(workspacePath: string, analyzer: MorphAnalyzer, verticalFile: number) {
  let articlePathsGLob = join(workspacePath, 'den/fetched_articles/*/**/*.html')
  let articlePaths = globSync(articlePathsGLob)

  for (let path of articlePaths) {
    console.log(`processing den article ${trimExtension(basename(path))}`)

    try {
      let html = fs.readFileSync(path, 'utf8')
      var { author, date, paragraphs, title, url, valid} = parseDenArticle(html, htmlDocCreator)
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
      text_type: 'публіцистика',
    }
    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function tyzhden(workspacePath: string, analyzer: MorphAnalyzer, verticalFile: number) {
  let articlePathsGLob = join(workspacePath, 'tyzhden/html/**/*.html')
  let articlePaths = globSync(articlePathsGLob, { nosort: true })
    .sort((a, b) => Number(trimExtension(basename(a))) - Number(trimExtension(basename(b))))

  for (let path of articlePaths) {
    try {
      let html = fs.readFileSync(path, 'utf8')
      var { author, date, paragraphs, title, url, isValid} = parseTyzhdenArticle(html, htmlDocCreator)
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
      text_type: 'публіцистика',
    }

    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function zbruc(workspacePath: string, analyzer: MorphAnalyzer, verticalFile: number) {
  let articlePathsGLob = join(workspacePath, 'zbruc/fetched_articles/**/*.html')
  let articlePaths = globSync(articlePathsGLob)

  for (let path of articlePaths) {
    try {
      let html = fs.readFileSync(path, 'utf8')
      var { author, date, paragraphs, title, url, isValid} = parseZbrucArticle(html, htmlDocCreator)
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
      text_type: 'публіцистика',
    }

    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function dzt(workspacePath: string, analyzer: MorphAnalyzer, verticalFile: number) {
  let articlePathsGLob = join(workspacePath, 'dzt/fetched_articles/**/*.html')
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
      text_type: 'публіцистика',
    }

    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
}

//------------------------------------------------------------------------------
function kontrakty(workspacePath: string, analyzer: MorphAnalyzer, verticalFile: number) {
  let files = globSync(join(workspacePath, 'kontrakty') + '/*.txt')
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
      text_type: 'публіцистика',
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
function createVerticalFile(workspace: string, partName: string) {
  let filePath
  let i = 0
  do {
    let suffix = i ? `.${i}` : ''
    filePath = join(workspace, `${partName}${suffix}.vertical.txt`)
    ++i
  } while (fs.existsSync(filePath))

  mkdirpSync(workspace)
  return fs.openSync(filePath, 'w')
}

//------------------------------------------------------------------------------
function mitei(workspacePath: string, analyzer: MorphAnalyzer, verticalFile: number, args: Args) {
  buildMiteiVertical(args.mitei, analyzer, verticalFile)
}
