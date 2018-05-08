import { join } from 'path'
import { parse } from 'url'
import { readFileSync } from 'fs'
import * as minimist from 'minimist'

import { FsMap } from '../../fs_map'
import { fetchText } from '../../request_utils'
import { tryParseHtml } from '../../xml/utils.node'
import { get } from 'request'
import { arr2indexMap } from '../../algo';
import * as _ from 'lodash';
import { trimBeforeFirst, trimBeforeLast } from '../../string_utils';


interface Args {
  workspace: string
  curNumPages: number
  satartWithPage: number
  oldNumPages: number
}


const baseHref = 'http://chtyvo.org.ua/'

const extensionPriorityKeyer = arr2indexMap([
  'fb2',
  'html',
  'htm',
  'txt',
  'doc',
  'rtf',
  'epub',
  'mobi',
  'pdf',
  'djvu',
])

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
    },
    default: {
      workspace: '.',
      oldNumPages: 0,
      satartWithPage: 1,
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  let fetchedPagesDir = join(args.workspace, 'chtyvo', 'data')
  let pages = new FsMap(fetchedPagesDir)
  let fetchThroughPage = args.curNumPages - args.oldNumPages
  for (let i = args.satartWithPage; i <= fetchThroughPage; ++i) {
    let baseName = `updates/page-${i}`
    let indexUrl = baseHref + baseName + `/`
    console.log(`processing ${indexUrl} #########`)
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

    let bookHrefs = indexRoot.evaluateAttributes('//a[@class="new_book_book"]/@href')
      .map(x => parse(x.value()))

    for (let bookHref of bookHrefs) {
      let metaFilishName = `${bookHref.pathname.slice(1, -1)}.meta.html`
      let metaContent: string
      if (pages.has(metaFilishName)) {
        metaContent = readFileSync(join(fetchedPagesDir, metaFilishName), 'utf8')
        console.log(`exists ${bookHref.pathname}`)
      } else {
        console.log(`processing ${bookHref.pathname}`)
        metaContent = await fetchText(bookHref.href)
        pages.set(metaFilishName, metaContent)
      }
      let root = tryParseHtml(metaContent)
      if (!root) {
        console.error('✖️')
        continue
      }
      let dataUrls = [...root.evaluateAttributes('//table[@class="books"]//a/@href')
        .map(x => x.value())
        .filter(x => !!x
          && /\/authors\/.*\./.test(x)
          && !['djvu', 'pdf'].some(xx => x.endsWith(`.${xx}`))
        )
        .map(x => parse(x))]

      if (!dataUrls.length) {
        console.error(`No data urls`)
        continue
      }

      let dataUrl = _.minBy(dataUrls, x => {
        let path = x.pathname
        if (path.endsWith('.zip')) {
          path = path.slice(0, -4)
        }
        let last = trimBeforeLast(path, '/')
        let extension = trimBeforeFirst(last, '.')
        return extensionPriorityKeyer.get(extension)
      })

      if (!dataUrl) {
        console.error(`Cannot choose url`, dataUrls.map(x => x.href))
        continue
      }

      let filish = dataUrl.pathname.substr(1)
      if (!pages.has(filish)
        && (!filish.endsWith('.zip') || !pages.has(filish.slice(0, -4)))
      ) {
        await pages.setStream(filish, get(dataUrl.href))
        console.log(`saved ${filish}`)
      }
    }
  }
}
