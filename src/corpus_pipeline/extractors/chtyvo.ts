import { AbstractElement } from '../../xml/xmlapi/abstract_element'
import { parseHtmlFileSync, parseHtml } from '../../xml/utils.node'
import { autofixDirtyText, plaintext2paragraphsTrimmed, tokenizeUkNew } from '../../nlp/utils'
import { mu } from '../../mu'
import { CorpusDoc } from '../doc_meta'
import { execSync } from 'child_process'
import { trimExtension, isAllcaps } from '../../string'
import { match } from '../../lang'
import { trimBack, trim } from '../../array'
import { MorphAnalyzer } from '../../nlp/morph_analyzer/morph_analyzer'

import detectCharacterEncoding = require('detect-character-encoding')
import { decode } from 'iconv-lite'
import * as glob from 'glob'

import { parse } from 'url'
import * as fs from 'fs'
import * as path from 'path'



const docFormatBooktypes = [
  'Байка',
  'Драма',
  'Есей',
  'Казка',
  'Комедія',
  'Легенда/Міт',
  'Новела',
  'Оповідання',
  'П\'єса',
  'Повість',
  'Поезія',
  'Поема',
  'Притча',
  'Роман',
  'Спогади',
]

export function* streamDocs(filePath: string, opts: { analyzer: MorphAnalyzer }) {
  if (filePath.endsWith('.meta.html')) {
    return
  }

  let basePath = trimExtension(filePath)
  if (basePath.endsWith('.epub')) {
    basePath = trimExtension(basePath)
  }
  let metaPath = `${basePath}.meta.html`


  // todo: skip словники?
  try {
    let format = [
      'fb2',
      'html',
      'htm',
      'txt',
      'doc',
      'rtf',
      // 'djvu',
      // 'pdf',
      'epub.dir',
    ].find(x => fs.existsSync(`${basePath}.${x}`))

    if (!format) {
      console.log(`format not supported ${basePath}`)
      return
    }

    let dataPath = `${basePath}.${format}`

    console.log(`processing ${dataPath}`)

    let metaRoot = parseHtmlFileSync(metaPath)
    let meta = extractMeta(metaRoot) as any
    if (meta.isForeign) {
      console.log(`foreign`)
      return
    }
    if (!meta.title) {
      console.log(`no title`)
      return
    }
    meta.source = 'Чтиво'

    if (format === 'doc') {
      if (meta.documentType && !docFormatBooktypes.find(x => x === meta.documentType)) {
        console.error(`Forbidden genre for a .doc: ${meta.documentType}`)
        return
      }
      let paragraphs = extractParsFromDocWithLibre(dataPath)
      if (paragraphs) {
        yield { paragraphs, ...meta } as CorpusDoc
      }
    } else if (format === 'epub.dir') {
      let paragraphs = processEpub(dataPath)
      yield { paragraphs, ...meta } as CorpusDoc
    } else if (format === 'pdf') {
      yield* processPdf(dataPath, meta, opts.analyzer)
    } else {
      let content = readFileSyncAutodetect(dataPath)
      if (!content) {
        console.log(`bad encoding`)
        return
      }

      if (format === 'fb2') {
        // content = renameTag(content, 'poem', 'p')
        // content = renameTag(content, 'stanza', 'lg type="stanza"')
        // content = renameTag(content, 'v', 'l')
        let root = parseHtml(content)
        mu(root.evaluateElements('//a[@type="notes"]')).toArray().forEach(x => x.remove())
        let paragraphs = mu(root.evaluateElements('//body[not(@name) or @name!="notes"]//p'))
          // todo: inline verses
          .map(x => autofixDirtyText(x.text().trim()))
          .filter(x => x && !/^\s*(©|\([cс]\))/.test(x))  // todo: DRY
          .toArray()

        yield { paragraphs, ...meta } as CorpusDoc
      } else if (format === 'htm' || format === 'html') {
        let root = parseHtml(content)
        let paragraphsIt = root.evaluateElements(
          // '//p[not(@*) and not(descendant::a) and preceding::h2[descendant::*/text() != "Зміст"]]')
          '//p[not(@*) and not(descendant::*) or @class="MsoNormal"]')
          .map(x => normalizeText(x.text()).replace(/\n+/g, ' '))
          .filter(x => x && !/^\s*(©|\([cс]\))/.test(x))
        let paragraphs = paragraphsIt.toArray()

        yield { paragraphs, ...meta } as CorpusDoc
      } else if (format === 'txt') {
        if (/\.(djvu|pdf)\.txt$/.test(dataPath)) {  // skip OCR for now
          return
        }
        content = extractTextFromTxt(content)
        content = normalizeText(content)
        content = content.replace(/\n+/g, '\n').trim()

        let paragraphs = plaintext2paragraphsTrimmed(content)

        yield { paragraphs, ...meta } as CorpusDoc
      } else {
        console.log(`skipping (format "${format}" not supported yet)`)
      }
    }
  } catch (e) {
    console.error(`errr ${metaPath}`)
    console.error(e.stack)
  }
}

function processEpub(dataPath: string) {
  // caution, out of order possible
  return glob.sync(`${dataPath}/**/*.{html,xhtml}`)
    .map(parseHtmlFileSync)
    .map(x => x.evaluateElements(`//p`).toArray())
    .flat()
    .map(x => x.text())
  // console.error(els)
  // return els
}

function* processPdf(dataPath: string, meta, analyzer: MorphAnalyzer) {
  let hasImages = !!getNumImagesInPdfSync(dataPath)
  let hasFonts = !!getNumFontsInPdfSync(dataPath)

  if (!hasImages && !hasFonts) {
    console.error(`PDF contains no images, no fonts`)
    return
  }
  if (!hasImages) {
    let toTxt = execSync(`pdf2txt -M 3 -L 0.6 "${dataPath}"`, { encoding: 'utf8' })
    let paragraphs = postprocessPdf2txt(toTxt, analyzer)
    yield { paragraphs, ...meta, source_type: 'pdf-txt' } as CorpusDoc
  } else if (!hasFonts) {

  } else {

  }
}

function extractMeta(root: AbstractElement) /*: CorpusDocumentAttributes*/ {
  let year = getTableValue(root, 'Написано')
  year = year.split(/\s/)[0]

  let title = getTextByClassName(root, 'h1', 'book_name')
  title = autofixDirtyText(title)
  let isForeign = /\([а-яєґїі]{2,8}\.\)$/.test(title)
  let translator = root.evaluateString('string(//div[@class="translator_pseudo_book"]/a/text())')
  translator = autofixDirtyText(translator.trim())
  let originalAutor = root.evaluateString('string(//div[@class="author_name_book"]/a/text())')
  originalAutor = autofixDirtyText(originalAutor.trim())
  if (originalAutor === 'народ Український') {
    originalAutor = 'народ'
  }
  let documentType = getTextByClassName(root, 'div', 'book_type')
  let section = root.evaluateString(
    `string(//table[@class="books"]//strong[text()="Розділ:"]/parent::*/following-sibling::td/a/text())`)
  let urlStr = root.evaluateString('string(//meta[@property="og:url"]/@content)')

  if (!urlStr) {
    throw new Error(`No url in chtyvo meta`)
  }
  let referenceTitle = title
  if (!referenceTitle) {
    let url = parse(urlStr)
    referenceTitle = `chtyvo-${url.pathname.replace('/authors', '')}`
  }

  return {
    title,
    date: translator ? undefined : year,
    author: translator || originalAutor,
    original_author: translator && originalAutor || undefined,
    domain: section === 'Історична' ? 'історія' : undefined,
    chtyvo_type: documentType,
    chtyvo_section: section,
    url: urlStr,
    isForeign,
  }
}

function getTableValue(root: AbstractElement, key: string) {
  return root.evaluateString(
    `string(//table[@class="books"]//strong[text()="${key}:"]/parent::*/following-sibling::td/text())`)
}

function getTextByClassName(root: AbstractElement, elName: string, className: string) {
  return root.evaluateString(`string(//${elName}[@class="${className}"]/text())`)
}

function hasSmashedEncoding(str: string) {
  return !str.includes('і') || str.includes('Ђ')
}

function readFileSyncAutodetect(path: string) {
  let bytes = fs.readFileSync(path)
  let encoding = detectCharacterEncoding(bytes).encoding
  let content = decode(bytes, encoding)
  if (!hasSmashedEncoding(content)) {
    return content
  }
}

function extractTextFromTxt(str: string) {
  return str.replace(/^[\s\S]{0,300}-{9,}/, '')
    .replace(/\n[\s\-]*---\s*КІНЕЦЬ[\s\S]{0,5000}$/, '')
    .replace(/-{4,}[\s\S]{0,400}$/, '')
    .replace(/-{5,}[\s\S]+(Бібліографія|Примітки:)([\s\S]{0,10000}|(\[\d+\])+\s+[^\n]+(\n|$))$/, '')
}

function killReferences(str: string) {
  return str.replace(/\s\[\d+\]/g, '')
}

function normalizeText(str: string) {
  let ret = autofixDirtyText(str)
  ret = killReferences(ret)
  return ret.trim()
}

function extractParsFromDocWithLibre(filePath: string) {
  execSync(`timeout 60s soffice --headless --convert-to html `  // hangs for xhtml
    + `"${filePath}" --outdir tmp`)
  let convertedPath = path.basename(filePath)
  convertedPath = trimExtension(convertedPath)
  convertedPath = path.join('tmp', `${convertedPath}.html`)
  let content = fs.readFileSync(convertedPath, 'utf8')
  fs.unlinkSync(convertedPath)
  if (hasSmashedEncoding(content)) {
    console.log(`bad encoding`)
    return
  }
  content = content.replace(/<head>[\s\S]*<\/head>/, '')  // needed
  content = content.replace(/<br[^>]>/g, ' ')
  let root = parseHtml(content)
  let paragraphs = mu(root.evaluateElements('//p|//li'))
    .map(x => (x.text().trim()))
    .filter(x => x && !/^\s*(©|\([cс]\))/.test(x))  // todo: DRY
    .toArray()

  return paragraphs
}

function getNumImagesInPdfSync(filePath: string) {
  let outLines = execSync(`pdfimages -list "${filePath}" 2> /dev/null`, { encoding: 'utf8' })
    .trim()
    .split('\n')
  return outLines.length - 2
}

function getNumFontsInPdfSync(filePath: string) {
  let outLines = execSync(`pdffonts "${filePath}" 2> /dev/null`, { encoding: 'utf8' })
    .trim()
    .split('\n')
  return outLines.length - 2
}

function postprocessPdf2txt(txt: string, analyzer: MorphAnalyzer) {
  let pages = txt.trim()
    .split('\f')
    .map(x => x.split('\n')
      .map(xx => xx.trim())
    )

  // remove headers
  pages.forEach(x => x.pop())  // this usually is an empty line if no headers

  for (let lines of pages) {
    trim(lines)
    trimBack(lines, x => /^\d+$|^[~─]\s*\d+\s*[~─]$/.test(x))  // page numbers
    trimBack(lines)
  }

  let lines = pages.map(x => x.map((xx, i) => [xx, i === x.length - 1] as [string, boolean]))
    .flat()
  let paragraphs = new Array<string>()
  let curPar = ''
  for (let [[line, isLastOnPage], nextLineDescr] of mu(lines).window(2)) {
    let nextLine = nextLineDescr && nextLineDescr[0]
    if (!line || isLastOnPage && nextLine && isAllcaps(nextLine[0])) {
      paragraphs.push(curPar)
      curPar = ''
      continue
    }

    if (nextLine) {
      let [, leftie, hyphen] = match(line, /(\S+)([‑\-–])$/)
      if (leftie) {
        leftie = mu(tokenizeUkNew(leftie, analyzer)).last()[0]
        let [, rightie] = match(nextLine, /^(\S+)/)
        rightie = mu(tokenizeUkNew(rightie, analyzer)).first()[0]
        let hyphenFriends = leftie + hyphen + rightie
        if (!analyzer.canBeToken(hyphenFriends)) {  // it’s syllabication
          line = line.slice(0, -1)
        }
      } else {
        line += ' '
      }
    }
    curPar += line
  }
  paragraphs.push(curPar)

  return paragraphs
}

/*

to filter:z
- footnotes, both слово6 and the body



"Слід відзначити, що джерела з “татарського відділу” АКВ АГАД постійно перебували в центрі уваги польських орієнталістів, певна частина їх була вже видана, наприклад, ін
струкція для посла Речі Посполитої до Криму М. Яскульського 1654 p. (388)2, їх використовували при написанні праць з історії польсько-кримських відносин, наприклад, видатний
 польський тюрколог-кримознавець Богдан Барановський. Окремі джерела",
    "__________________________________________________________________",
    "1 Сигнатури документів “татарського відділу” АКВ АГАД є досить незручними. Подаємо тут і далі лише порядковий номер справи, без вказівок на “картон” чи “теку”. Цього, о
днак, достатньо, щоб розшукати без проблем необхідну справу у фонді. 2 Загальни

http://shron1.chtyvo.org.ua/Mytsyk_Yurii/Ohliad_dokumentatsii_tatarskoho_viddilu_fondu_Arkhiv_koronnyi_u_Varshavi_AHAD.pdf


*/
