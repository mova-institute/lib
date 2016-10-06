import { join } from 'path'
import * as minimist from 'minimist'

import { Crawler } from './crawler'



interface Args {
  workspace: string
  seed: string
}


const cats = [
  'Politics',
  'Economics',
  'World',
  'Society',
  'Culture',
  'Travel',
  'History',
  'Auto',
  'Warsubject',
  'Columns',
  'PressReleases',
  'PrivateUrbanStudies',
  'News',
]


if (require.main === module) {
  const args: Args = minimist(process.argv.slice(2), {
    alias: {
      'workspace': ['ws'],
    },
    default: {
      seed: 'http://tyzhden.ua/Archive',
    },
  }) as any

  main(args)
}


async function main(args: Args) {
  const re = new RegExp(String.raw`^(${cats.join('|')})/\d+`)
  try {
    let crawler = new Crawler(join(args.workspace, 'tyzhden'))
      .setUrlsToFollow(x => !x.endsWith('/PrintView') && !/^(Gallery|Video|Author)\b/.test(x))
      .setUrlsToSave(x => re.test(x))
    crawler.seed(args.seed)
  } catch (e) {
    console.error(e)
  }
}
