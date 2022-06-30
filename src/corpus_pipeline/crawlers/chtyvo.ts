import { FsMap } from '../../fs_map'
import { fetchText } from '../../request'
import { tryParseHtml, parseHtml } from '../../xml/utils.node'
import { arr2indexMap } from '../../algo'
import { trimBeforeFirst, trimBeforeLast } from '../../string'
import { logErrAndExit } from '../../utils.node'
import { parseIntStrict } from '../../lang'

import minimist from 'minimist'
import * as _ from 'lodash'
import { get } from 'request'
import chalk from 'chalk'

import { join } from 'path'
import { parse } from 'url'
import { readFileSync } from 'fs'

interface Args {
  workspace: string
  curNumPages: number
  startWithPage: number
  oldNumPages: number
  dontStopEarly: boolean
}

const baseHref = 'http://chtyvo.org.ua/'

const extensionPriorityKeyer = arr2indexMap([
  'fb2',
  'html',
  'htm',
  'txt',
  'doc',
  'rtf',
  'djvu', // do prefer djvu over pdf
  'pdf',
  'epub',
  'mobi',
])

if (require.main === module) {
  const args = minimist<Args>(process.argv.slice(2), {
    alias: {
      workspace: ['ws'],
    },
    default: {
      workspace: '.',
      oldNumPages: 0,
      startWithPage: 1,
    },
    boolean: ['dontStopEarly,'],
  }) as any

  main(args).catch(logErrAndExit)
}

async function main(args: Args) {
  let fetchThroughPage = (await getMaxPages()) - (args.oldNumPages || 0)
  console.log(
    chalk.bold(
      `Will scan pages from ${args.startWithPage} to ${fetchThroughPage}`,
    ),
  )

  let fetchedPagesDir = join(args.workspace, 'chtyvo', 'data')
  let pages = new FsMap(fetchedPagesDir)
  for (let i = args.startWithPage; i <= fetchThroughPage; ++i) {
    let baseName = `updates/page-${i}`
    let indexUrl = baseHref + baseName + `/`
    process.stdout.write(`processing ${indexUrl} #########\n`)
    try {
      var indexContent = await fetchText(indexUrl)
    } catch (e) {
      continue
    }
    let indexRoot = tryParseHtml(indexContent)
    if (!indexRoot) {
      console.error('✖️')
      continue
    }

    let bookHrefs = indexRoot
      .evaluateAttributes('//a[@class="new_book_book"]/@href')
      .map((x) => parse(x.value()))

    let hasNewCovers = false
    for (let bookHref of bookHrefs) {
      let metaFilishName = `${bookHref.pathname.slice(1, -1)}.meta.html`
      let metaContent: string
      if (pages.has(metaFilishName)) {
        metaContent = readFileSync(
          join(fetchedPagesDir, metaFilishName),
          'utf8',
        )
        // console.log(`exists ${bookHref.pathname}`)
      } else {
        process.stdout.write(`processing ${bookHref.pathname}`)
        metaContent = await fetchText(bookHref.href)
        pages.set(metaFilishName, metaContent)
        hasNewCovers = true
      }
      let root = tryParseHtml(metaContent)
      if (!root) {
        console.error('✖️')
        continue
      }
      let dataUrls = root
        .evaluateAttributes('//table[@class="books"]//a/@href')
        .map((x) => x.value())
        .filter(
          (x) => Boolean(x) && /\/authors\/.*\./.test(x),
          // && !['djvu', 'pdf'].some(xx => x.endsWith(`.${xx}`))
        )
        .map((x) => parse(x))
        .toArray()

      if (!dataUrls.length) {
        // console.error(`No data urls`)
        continue
      }

      let dataUrl = _.minBy(dataUrls, (x) => {
        let path = x.pathname
        if (path.endsWith('.zip')) {
          path = path.slice(0, -4)
        }
        let last = trimBeforeLast(path, '/')
        let extension = trimBeforeFirst(last, '.')
        return extensionPriorityKeyer.get(extension)
      })

      if (!dataUrl) {
        console.error(
          `Cannot choose url`,
          dataUrls.map((x) => x.href),
        )
        throw new Error(`Unknown extension in "${dataUrl}"`)
        // continue
      }

      let filish = dataUrl.pathname.substr(1)
      if (
        !pages.has(filish) &&
        !(filish.endsWith('.epub') && pages.has(`${filish}.dir`)) &&
        (!filish.endsWith('.zip') || !pages.has(filish.slice(0, -4)))
      ) {
        await pages.setStream(filish, get(dataUrl.href))
        console.log(` ✔ ${trimBeforeFirst(filish, '.')}`)
      }
    }

    if (!args.dontStopEarly && !hasNewCovers) {
      console.error(`No new covers, stopping early`)
      return
    }
  }
}

async function getMaxPages() {
  let content = await fetchText(`http://chtyvo.org.ua/updates/`)
  let root = parseHtml(content)
  let elem = root.evaluateElement(`(//div[@class="paging"]//a)[last()]`)
  let ret = parseIntStrict(elem.text())

  return ret
}
