import { logErrAndExit, linesBackpressedStdPipeable, writeLines, linesBackpressed } from '../../../utils.node'
import { nameFromLoginAtDomain } from '../utils'
import { toSortableDatetime } from '../../../date'
import { JsonObjectLogReader } from './json_object_log_reader'
import { normalizeParagraph } from '../../bin/filter_tokenize_micrawl'

import * as minimist from 'minimist'
import { plaintext2ParagraphsTrimmed } from '../../../nlp/utils'
import { conlluStrAndMeta2vertical } from '../../tovert'
import { UdpipeApiClient } from '../../../nlp/ud/udpipe_api_client'
import { AsyncTaskRunner } from '../../../async_task_runner'
import { mapInplace } from '../../../lang'
import { ZvidusilDocFilter } from '../../filter'
import { createMorphAnalyzerSync } from '../../../nlp/morph_analyzer/factories.node'
import { getLibRootRelative } from '../../../lib_path.node'
import { readStringDawgSync } from 'dawgjs'
import { BufferedBackpressWriter, StreamPauser } from '../../../backpressing_writer'

import * as fs from 'fs'
import * as util from 'util'



//------------------------------------------------------------------------------
function bakeTweetObservation(tweet) {
  let observedAt = new Date(tweet.created_at)

  let cur = tweet
  if (cur.retweeted_status) {
    cur = cur.retweeted_status
  }

  let id = cur.id_str as string
  let login = cur.user.screen_name
  let name = cur.user.name
  let isReposted = cur.extended_tweet
  let text: string = isReposted && cur.extended_tweet.full_text
    || cur.text
  let createdAt = new Date(cur.created_at)

  text = text.replace(/(\s*https:\/\/t.co\/[\w]+)+$/g, '')
  // next 3 only:
  text = text.replace(/&gt;/g, '>')
  text = text.replace(/&lt;/g, '<')
  text = text.replace(/&amp;/g, '&')

  text = text.trim()

  let url = `https://twitter.com/statuses/${id}`

  // todo: replace hrefs https://twitter.com/statuses/1000738462897704961

  return {
    observedAt,
    isReposted,
    id,
    url,
    text,
    login,
    name,
    lang: cur.lang as string,
    createdAt,
    isTruncated: cur.truncated,
  }
}

//------------------------------------------------------------------------------
interface Args {
  watch: boolean
  filter: boolean
  format: 'glance' | 'conllu' | 'vertical'
  udpipeUrl: string
  ruLexicon: string
  filterLog: string
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2), {
    boolean: [
      'watch',
      'filter',
    ],
    default: {
      format: 'vertical',
      ruLexicon: getLibRootRelative('../data/lexicon-ru.dawg'),
    }
  })

  let analyzer = createMorphAnalyzerSync()
  let reader = new JsonObjectLogReader().setIgnoreErrors()
  let udpipe = new UdpipeApiClient(args.udpipeUrl)
  let runner = new AsyncTaskRunner()
  let filter = new ZvidusilDocFilter(analyzer, {
    filterPreviews: false,
  }).setRuLexicon(readStringDawgSync(args.ruLexicon))
  let stdinPauser = new StreamPauser(process.stdin)
  let logWriter = new BufferedBackpressWriter(
    fs.createWriteStream(args.filterLog), undefined, stdinPauser)

  let seenIds = new Set<string>()

  let nTotalTweets = 0
  let nDuplicateTweets = 0
  let nNonUkTweets = 0
  let nFilteredTweets = 0
  let nAccepedTweets = 0

  let logRejection = (reason: string, obj) => {
    logWriter.write(reason)
    let objDump = util.inspect(obj, {
      colors: true,
    })
    logWriter.write(objDump)
    logWriter.write('\n\n')
    logWriter.flush()
  }

  await linesBackpressedStdPipeable(async (line, stdoutWriter) => {
    let rawObservation = reader.feed(line)
    if (!rawObservation) {
      return
    }
    ++nTotalTweets

    let observation = bakeTweetObservation(rawObservation)
    let { id, url, text, isTruncated, login, createdAt, lang } = observation

    if (args.format === 'glance') {
      console.error(text)
      console.error(url)
      console.error()

      return
    }

    let paragraphs = plaintext2ParagraphsTrimmed(text)

    if (lang !== 'uk') {
      ++nNonUkTweets
      // logRejection(`non-uk`, observation)
      return
    }
    if (isTruncated) {
      paragraphs.pop()
    }
    if (!paragraphs.length) {
      return
    }
    if (seenIds.has(id)) {
      ++nDuplicateTweets
      return
    }
    seenIds.add(id)

    let author = nameFromLoginAtDomain(login, 'twitter.com')

    let meta = {
      title: '',  // todo
      source: 'Твітер',
      url,
      author,
      date: toSortableDatetime(createdAt),
    } as any

    mapInplace(paragraphs, normalizeParagraph)

    if (!paragraphs || !paragraphs.length) {
      logRejection(`Paragraphs are empty or invalid`, observation)
      return
    }
    if (!meta) {
      logRejection(`Meta is empty or invalid`, observation)
      return
    }

    let { docValid, filteredParagraphs, gapFollowerIndexes, message } =
      filter.filter(paragraphs, meta)

    if (!docValid) {
      ++nFilteredTweets
      logRejection(`Doc rejected: ${message}`, observation)
      return
    }

    await runner.post(async () => {
      try {
        var conllu = await udpipe.tokenizeParagraphs(filteredParagraphs)
      } catch {
        console.error(`Udpipe error for`, filteredParagraphs)
        return
      }

      if (args.format === 'vertical') {
        let vertStream = conlluStrAndMeta2vertical(conllu, {
          meta,
          formOnly: true,
          pGapIndexes: gapFollowerIndexes,
        })
        await writeLines(vertStream, stdoutWriter)
      } else if (args.format === 'conllu') {
        stdoutWriter.write(conllu)
        stdoutWriter.write('')
      }

      if (args.watch) {
        stdoutWriter.flush()
      }
    })
  }, stdinPauser)

  let stats = {
    nTotalTweets,
    nNonUkTweets,
    nDuplicateTweets,
    nFilteredTweets,
    nAccepedTweets,
  }

  console.error(stats)
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}

