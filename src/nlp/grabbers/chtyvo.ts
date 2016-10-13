import { join } from 'path'
import { parse } from 'url'
import { createWriteStream } from 'fs'
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
  'html',
  'htm',
  'html.zip',
  'htm.zip',
  'txt',
  'txt.zip',
  'rtf',
  'rtf.zip',
  'doc',
  'doc.zip',
  'fb2',
  'fb2.zip',
  'epub',
  'epub.zip',
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
    for (let i = 564; i >= 0; --i) {
      let baseName = `updates/page-${i}`
      let indexUrl = baseHref + baseName + `/`
      console.log(`processing ${indexUrl}`)
      let indexContent = await fetchText(indexUrl)
      let indexRoot = parseHtml(indexContent)
      let bookHrefs = indexRoot.evaluateAttributes('//a[@class="new_book_book"]/@href')
        .map(x => parse(x.value()))

      for (let bookHref of bookHrefs) {
        let metaFilishName = `${bookHref.pathname.slice(1, -1)}.meta.html`
        if (pages.has(metaFilishName)) {
          continue
        }
        console.log(`processing ${bookHref.pathname}`)
        let metaContent = await fetchText(bookHref.href)
        pages.set(metaFilishName, metaContent)
        let root = parseHtml(metaContent)
        for (let extension of extensionPriority) {
          let dataUrl = root.evaluateAttributes('//table[@class="books"]//a/@href')
            .map(x => parse(x.value()))
            .find(x => x.path.endsWith(`.${extension}`))
          if (dataUrl) {
            let filish = dataUrl.pathname.substr(1)
            if (!pages.has(filish)) {
              await pages.setStream(filish, get(dataUrl.href))
              console.log(`saved ${filish}`)
            }
            break
          }
        }
      }
    }
  } catch (e) {
    console.error(e)
  }
}
