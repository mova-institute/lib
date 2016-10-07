#!/usr/bin/env node

import { basename, join } from 'path'
import * as fs from 'fs'

import { sync as globSync } from 'glob'
import { sync as mkdirpSync } from 'mkdirp'
import { parseHtmlString } from 'libxmljs'
import { LibxmljsDocument } from 'xmlapi-libxmljs'
import * as minimist from 'minimist'

import { MorphAnalyzer } from '../nlp/morph_analyzer/morph_analyzer'
import { createMorphAnalyzerSync } from '../nlp/morph_analyzer/factories.node'
import { keyvalue2attributesNormalized } from '../xml/utils'
import { parseUmolodaArticle } from '../nlp/parsers/umoloda'
import { parseDztArticle } from '../nlp/parsers/dzt'
import { parseDenArticle } from '../nlp/parsers/den'
import { parseZbrucArticle } from '../nlp/parsers/zbruc'
import { parseTyzhdenArticle } from '../nlp/parsers/tyzhden'
import { trimExtension } from '../string_utils'
import * as nlpUtils from '../nlp/utils'



interface Args {
  workspace: string
  part: string
}



const partName2function = {
  umoloda,
  dzt,
  kontrakty,
  den,
  zbruc,
  tyzhden,
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
  func(args.workspace, analyzer, verticalFile)
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
      publisher: 'Україна молода',
      proofread: '✓',
      href: `http://www.umoloda.kiev.ua/number/${a}/${b}/${c}/`,
      author,
      title,
      date,
      text_type: 'публіцистика::стаття',
    }
    writeDocMetaAndParagraphs(meta, paragraphs, analyzer, verticalFile)
  }
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
      publisher: 'День',
      proofread: '✓',
      href: url,
      author,
      title,
      date,
      text_type: 'публіцистика::стаття',
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
      publisher: 'Тиждень',
      proofread: '✓',
      href: url,
      author,
      title,
      date,
      text_type: 'публіцистика::стаття',
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
      publisher: 'Збруч',
      proofread: '✓',
      href: url,
      author,
      title,
      date,
      text_type: 'публіцистика::стаття',
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
      publisher: 'Дзеркало тижня',
      proofread: '✓',
      href: url,
      author,
      title,
      date: datetime,
      text_type: 'публіцистика::стаття',
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
      publisher: 'Галицькі контракти',
      title: `Контракти ${year}`,
      year_created: year,
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
