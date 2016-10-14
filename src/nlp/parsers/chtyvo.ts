import { join } from 'path'
import { readFileSync, existsSync } from 'fs'

import { sync as globSync } from 'glob'
import { decode } from 'iconv-lite'
import { AbstractElement } from 'xmlapi'

import { parseHtmlFileSync, parseHtml } from '../../xml/utils.node'
import { normalizeCorpusTextString, string2tokenStream } from '../utils'
import { MorphAnalyzer } from '../morph_analyzer/morph_analyzer'
import { Token } from '../token'

const detectCharacterEncoding = require('detect-character-encoding');



////////////////////////////////////////////////////////////////////////////////
export function* streamChtyvo(workspace: string, analyzer: MorphAnalyzer) {
  let metas = globSync(join(workspace, '**/*.meta.html'))
  for (let metaPath of metas) {
    try {
      let basePath = metaPath.slice(0, -'.meta.html'.length)
      let txtPath = `${basePath}.txt`
      let htmPath = `${basePath}.htm`
      let docPath = `${basePath}.doc`

      console.log(`processing ${basePath}`)
      let metaRoot = parseHtmlFileSync(metaPath)
      let meta = extractMeta(metaRoot)
      if (meta.isForeign) {
        console.log(`skipping foreign`)
        continue
      }

      if (/*false && */existsSync(txtPath)) {
        let content = readFileSyncAutodetect(txtPath)
        if (content) {
          content = extractTextFromTxt(content)
          content = normalizeText(content)
          content = content.replace(/\n+/g, '\n').trim()

          let paragraphs = content.split(/\s*\n\s*/)
          yield* yieldParagraphs(paragraphs, meta, analyzer)
        }
      } else if (existsSync(htmPath)) {
        let htmlstr = readFileSyncAutodetect(htmPath)
        if (htmlstr) {
          let root = parseHtml(htmlstr)
          let paragraphsIt = root.evaluateElements(
            // '//p[not(@*) and not(descendant::a) and preceding::h2[descendant::*/text() != "Зміст"]]')
            '//p[not(@*) and not(descendant::*) or @class="MsoNormal"]')
            .map(x => normalizeText(x.text().trim()).replace(/\n+/g, ' '))
            .filter(x => x && !/^\s*(©|\([cс]\))/.test(x))
          let paragraphs = [...paragraphsIt]
          // if (!paragraphs.length) {
          //   console.log('noparagrrrr')
          // }
          yield* yieldParagraphs(paragraphs, meta, analyzer)
        }
      } else {
        console.log(`skipping (format not supported yet)`)
      }
    } catch (e) {
      console.error(`errr ${metaPath}`)
      console.error(e.stack)
    }
  }
}

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
function extractMeta(root: AbstractElement) {
  let year = getTableValue(root, 'Написано')
  year = year.split(/\s/)[0]

  let title = getTextByClassName(root, 'h1', 'book_name')

  let originalAutor = root.evaluateString('string(//div[@class="author_name_book"]/a/text())')
  let author = root.evaluateString('string(//div[@class="translator_pseudo_book"]/a/text())')
    || originalAutor

  let bookType = getTextByClassName(root, 'div', 'book_type')

  let section = root.evaluateString(
    `string(//table[@class="books"]//strong[text()="Розділ:"]/parent::*/following-sibling::td/a/text())`)

  let url = root.evaluateString('string(//meta[@property="og:url"]/@content)')

  let isForeign = /\([а-яєґїі]{2,8}\.\)$/.test(title)

  return { year, author, title, bookType, section, url, text_type: section, isForeign }
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
  let bytes = readFileSync(path)
  let encoding = detectCharacterEncoding(bytes).encoding
  let content = decode(bytes, encoding)
  if (!hasSmashedEncoding(content)) {
    return content
  }
}

//------------------------------------------------------------------------------
function extractTextFromTxt(str: string) {
  return str.replace(/^[\s\S]{0,300}-{9,}/, '')
    .replace(/[\s\-]*КІНЕЦЬ[\s\S]{0,400}$/, '')
    .replace(/-{4,}[\s\S]{0,400}$/, '')
    .replace(/-{5,}[\s\S]+(Бібліографія|Примітки:)([\s\S]{0,10000}|(\[\d+\])+\s+[^\n]+(\n|$))$/, '')
}

//------------------------------------------------------------------------------
function killReferences(str: string) {
  return str.replace(/\s\[\d+\]/g, '')
}

//------------------------------------------------------------------------------
function normalizeText(str: string) {
  let ret = normalizeCorpusTextString(str)
  ret = killReferences(ret)
  return ret
}

//------------------------------------------------------------------------------
function* yieldParagraphs(paragraphs: string[], meta: any, analyzer: MorphAnalyzer) {
  if (paragraphs.length) {
    yield Token.structure('document', false, meta)
    for (let p of paragraphs) {
      yield Token.structure('paragraph', false)
      yield* string2tokenStream(p, analyzer)
      yield Token.structure('paragraph', true)
    }
    yield Token.structure('document', true)
  }
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

*/
