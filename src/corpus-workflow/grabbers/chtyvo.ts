import { join } from 'path'
import { parse } from 'url'
import { readFileSync } from 'fs'
import { sync as mkdirpSync } from 'mkdirp'
import * as minimist from 'minimist'

import { FolderSavedMap } from '../../folder_saved_map.node'
import { FileSavedSet } from '../../file_saved_set.node'
import { matchAll, sleep } from '../../lang';
import { fetchText } from './utils'
import { parseHtml } from '../../xml/utils.node'
import { get } from 'request'

import { Crawler } from './crawler'


interface Args {
  workspace: string
}


const baseHref = 'http://chtyvo.org.ua/'
const extensionPriority = [
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
]

if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
    },
    default: {
      'workspace': '.',
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  try {
    let fetchedPagesDir = join(args.workspace, 'chtyvo/data')
    let pages = new FolderSavedMap(fetchedPagesDir, '**/*')
    for (let i = 554; i >= 0; --i) {
      let baseName = `updates/page-${i}`
      let indexUrl = baseHref + baseName + `/`
      console.log(`processing ${indexUrl} #########`)
      let indexContent = await fetchText(indexUrl)
      let indexRoot = parseHtml(indexContent)
      let bookHrefs = indexRoot.evaluateAttributes('//a[@class="new_book_book"]/@href')
        .map(x => parse(x.value()))

      for (let bookHref of bookHrefs) {
        let metaFilishName = `${bookHref.pathname.slice(1, -1)}.meta.html`
        let metaContent: string
        if (pages.has(metaFilishName)) {
          metaContent = readFileSync(join(fetchedPagesDir, metaFilishName), 'utf8')
          console.log(`read from cache ${bookHref.pathname}`)
        } else {
          console.log(`processing ${bookHref.pathname}`)
          metaContent = await fetchText(bookHref.href)
          pages.set(metaFilishName, metaContent)
        }
        let root = parseHtml(metaContent)
        let dataUrls = root.evaluateAttributes('//table[@class="books"]//a/@href')
          .map(x => x.value())
          .filter(x => !!x && /\/authors\/.*\./.test(x) && !x.endsWith('.djvu'))
          .map(x => parse(x))
        for (let dataUrl of [...dataUrls].sort()) {
          let filish = dataUrl.pathname.substr(1)
          if (!pages.has(filish) && (!filish.endsWith('.zip') || !pages.has(filish.slice(0, -4)))) {
            await pages.setStream(filish, get(dataUrl.href))
            console.log(`saved ${filish}`)
          }
        }
        /*loop:
        for (let format of extensionPriority) {
          for (let extension of [format, `${format}.zip`]) {
            let dataUrl = root.evaluateAttributes('//table[@class="books"]//a/@href')
              .map(x => parse(x.value()))
              .find(x => x && x.path.endsWith(`.${extension}`))
            if (dataUrl) {
              let filish = dataUrl.pathname.substr(1)
              if (!pages.has(filish)) {
                await pages.setStream(filish, get(dataUrl.href))
                console.log(`saved ${filish}`)
              }
              break loop
            }
          }
        }*/
      }
    }
  } catch (e) {
    console.error(e)
  }
}
