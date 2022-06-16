import minimist from 'minimist'
import { Crawler } from './crawler'

interface Args {
  saveDir: string
  workspace: string
  seed: string
}

const cats = [
  'Auto',
  'Columns',
  'Culture',
  'Economics',
  'History',
  'News',
  'Politics',
  'PressReleases',
  'PrivateUrbanStudies',
  'Publication',
  'Society',
  'Travel',
  'Warsubject',
  'World',
]

if (require.main === module) {
  const args = minimist<Args>(process.argv.slice(2), {
    default: {
      seed: 'http://tyzhden.ua/Archive',
      saveDir: 'saved_web',
      workspace: 'tyzhden',
    },
  }) as any

  main(args)
}

async function main(args: Args) {
  const re = new RegExp(String.raw`^/(${cats.join('|')})/\d+$`)
  try {
    let crawler = new Crawler(args.saveDir)
      .setUrlsToFollow([
        (x) =>
          !x.path.endsWith('/PrintView') &&
          x.hostname === 'tyzhden.ua' &&
          !/\/(Gallery|Video|Author)\//.test(x.path),
      ])
      .setUrlsToSave((x) => re.test(x.path) && x.hostname === 'tyzhden.ua')
    await crawler.seed(args.seed)
  } catch (e) {
    console.error(e)
  }
}
