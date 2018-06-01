import { logErrAndExit, linesBackpressedStdPipeable, writeLines } from '../../../utils.node'
import { nameFromLoginAtDomain } from '../utils'
import { toSortableDatetime } from '../../../date'
import { JsonObjectLogReader } from './json_object_log_reader'
import { MicrawlFilterTokenizer } from '../../bin/filter_tokenize_micrawl'

import * as minimist from 'minimist'



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

  // todo: replace hrefs https://twitter.com/statuses/1000738462897704961

  return {
    observedAt,
    isReposted,
    id,
    text,
    login,
    name,
    lang: cur.lang as string,
    createdAt,
    isTruncated: cur.truncated,
  }
}

//------------------------------------------------------------------------------
function twitterSpecificFilter(lang: string) {
  if (lang !== 'uk') {
    return true
  }

  return false
}

//------------------------------------------------------------------------------
interface Args {
  format: 'readable' | 'vertical'
  udpipeUrl: string
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2))

  if (args.format === 'vertical') {
    var filterTokenizer = new MicrawlFilterTokenizer(args.udpipeUrl || process.env['UDPIPE'])
  }

  let reader = new JsonObjectLogReader().setIgnoreErrors()
  let seenIds = new Set<string>()

  let nTotalTweets = 0
  let nDuplicateTweets = 0
  let nNonUkTweets = 0
  let nFilteredTweets = 0
  let nAccepedTweets = 0

  await linesBackpressedStdPipeable(async (line, writer) => {
    let rawTweet = reader.feed(line)
    if (!rawTweet) {
      return
    }
    ++nTotalTweets

    let observation = bakeTweetObservation(rawTweet)
    let { id, text, isTruncated, login, createdAt, lang } = observation

    if (lang !== 'uk') {
      ++nNonUkTweets
      return
    }

    let paragraphs = text.split(/(?:\s*\n+\s*)+/g)

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
    if (twitterSpecificFilter(lang)) {
      return
    }

    let author = nameFromLoginAtDomain(login, 'twitter.com')

    if (args.format === 'vertical') {
      let meta = {
        title: '',  // todo
        source: 'Твітер',
        url: `https://twitter.com/statuses/${id}`,
        author,
        date: toSortableDatetime(createdAt),
      }

      let vertStream = await filterTokenizer.filterTokenize(paragraphs, meta)
      if (!vertStream) {
        ++nFilteredTweets
        return
      }
      ++nAccepedTweets
      writeLines(vertStream, writer)
      writer.flush()
    } else if (args.format === 'readable') {
      console.log(paragraphs.join('\n'))
    }
  })
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

