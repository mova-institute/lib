import { parse } from 'url'
import * as fs from 'fs'
import * as path from 'path'

import { decode } from 'iconv-lite'
import { AbstractElement } from '../../xml/xmlapi/abstract_element'

import { parseHtmlFileSync, parseHtml } from '../../xml/utils.node'
import { autofixDirtyText } from '../../nlp/utils'
import { mu } from '../../mu'
import { CorpusDoc } from '../doc_meta'
import { execSync } from 'child_process'
import { trimExtension } from '../../string_utils'

const detectCharacterEncoding = require('detect-character-encoding')



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

////////////////////////////////////////////////////////////////////////////////
export function* streamDocs(basePath: string/*, analyzer: MorphAnalyzer*/) {
  let metaPath = `${basePath}.meta.html`

  try {
    let format = [
      'fb2',
      'html',
      'htm',
      'txt',
      'doc',
      'rtf',
    ].find(x => fs.existsSync(`${basePath}.${x}`))
    if (!format) {
      // console.log(`format not supported ${basePath}`)
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

      return
    }

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
      content = extractTextFromTxt(content)
      content = normalizeText(content)
      content = content.replace(/\n+/g, '\n').trim()

      let paragraphs = content.split(/\s*\n\s*/)

      yield { paragraphs, ...meta } as CorpusDoc
    } else {
      console.log(`skipping (format "${format}" not supported yet)`)
    }
  } catch (e) {
    console.error(`errr ${metaPath}`)
    console.error(e.stack)
  }
}

type chtyvoSection =
  'Химерна' |
  'Художня' |
  'Історична' |
  'Народна' |
  'Дитяча' |
  'Наукова' |
  'Навчальна' |
  'Детективи' |
  'Пригоди' |
  'Релігія' |
  'Публіцистика' |
  'Гумор' |
  'Любовна' |
  'Часописи'

const typeMap = {
  'Химерна': '',
  'Художня': '',
  'Історична': '',
  'Народна': '',
  'Дитяча': '',
  'Наукова': '',
  'Навчальна': '',
  'Детективи': '',
  'Пригоди': '',
  'Релігія': '',
  'Публіцистика': '',
  'Гумор': '',
  'Любовна': '',
  'Часописи': '',
}


//------------------------------------------------------------------------------
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

//------------------------------------------------------------------------------
function getTableValue(root: AbstractElement, key: string) {
  return root.evaluateString(
    `string(//table[@class="books"]//strong[text()="${key}:"]/parent::*/following-sibling::td/text())`)
}

//------------------------------------------------------------------------------
function getTextByClassName(root: AbstractElement, elName: string, className: string) {
  return root.evaluateString(`string(//${elName}[@class="${className}"]/text())`)
}

//------------------------------------------------------------------------------
function hasSmashedEncoding(str: string) {
  return !str.includes('і') || str.includes('Ђ')
}

//------------------------------------------------------------------------------
function readFileSyncAutodetect(path: string) {
  let bytes = fs.readFileSync(path)
  let encoding = detectCharacterEncoding(bytes).encoding
  let content = decode(bytes, encoding)
  if (!hasSmashedEncoding(content)) {
    return content
  }
}

//------------------------------------------------------------------------------
function extractTextFromTxt(str: string) {
  return str.replace(/^[\s\S]{0,300}-{9,}/, '')
    .replace(/\n[\s\-]*---\s*КІНЕЦЬ[\s\S]{0,5000}$/, '')
    .replace(/-{4,}[\s\S]{0,400}$/, '')
    .replace(/-{5,}[\s\S]+(Бібліографія|Примітки:)([\s\S]{0,10000}|(\[\d+\])+\s+[^\n]+(\n|$))$/, '')
}

//------------------------------------------------------------------------------
function killReferences(str: string) {
  return str.replace(/\s\[\d+\]/g, '')
}

//------------------------------------------------------------------------------
function normalizeText(str: string) {
  let ret = autofixDirtyText(str)
  ret = killReferences(ret)
  return ret.trim()
}

//------------------------------------------------------------------------------
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



/*

Альбом
Альманах
Байка
Газета
Довідник
Документ
Драма
Енциклопедія
Есей
Журнал
Казка
Каталог
Комедія
Комікс
Легенда/Міт
Нарис
Не визначено
Новела
Оповідання
П'єса
Підручник
Повість
Поезія
Поема
Посібник
Праця
Притча
Рецензія
Роман
Словник
Спогади
Стаття


Байка
Довідник
Документ
Драма
Енциклопедія
Есей
Казка
Комедія
Нарис
Не визначено
Новела
Оповідання
П'єса
Підручник
Повість
Поезія
Поема
Посібник
Праця
Роман
--Словник
Спогади
Стаття



художня проза
  казка
  справжній лист
  решта
  драма
поезія
  (поема
  (решта
публіцистика
інтернет
документалістика
  праця
  підр
  посібник
  енцик
  спогади
правниче
  закон
  угоди та інше
невизначене

*/



/*

find . -name "*.zip" | while read filename; do unzip -ou -d "`dirname "$filename"`" "$filename"; done;


*/
