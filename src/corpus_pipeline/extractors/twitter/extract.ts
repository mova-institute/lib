import { logErrAndExit, linesBackpressedStdPipeable } from '../../../utils.node'
import { StreamingExtractor } from '../../types'
import { nameFromLoginAtDomain } from '../utils'
import { toSortableDatetime } from '../../../date'
import { createMorphAnalyzerSync } from '../../../nlp/morph_analyzer/factories.node'
import { JsonObjectLogReader } from './json_object_log_reader'

import * as minimist from 'minimist'



//------------------------------------------------------------------------------
function parseTweetObservation(tweet) {
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

////////////////////////////////////////////////////////////////////////////////
export class TwitterStreamingDocExtracor implements StreamingExtractor {
  private reader = new JsonObjectLogReader()
  private seenIds = new Set<string>()

  private totalTweets = 0

  constructor() {
    this.reader.setIgnoreErrors()
  }

  feed(line: string) {
    let obj = this.reader.feed(line)
    if (!obj) {
      return
    }
    ++this.totalTweets

    let tweet = parseTweetObservation(obj)
    if (tweet.lang !== 'uk') {
      return
    }

    let {
      id,
      text,
      isTruncated,
      login,
      createdAt,
      lang,
    } = tweet

    let paragraphs = text.split(/(?:\s*\n+\s*)+/g)

    if (isTruncated) {
      paragraphs.pop()
    }

    if (!paragraphs.length) {
      return
    }

    if (this.seenIds.has(id)) {
      return
    }

    this.seenIds.add(id)

    if (twitterSpecificFilter(lang)) {
      return
    }

    let author = nameFromLoginAtDomain(login, 'twitter.com')

    return {
      paragraphs,
      title: '',  // todo
      source: 'Твітер',
      url: `https://twitter.com/statuses/${id}`,
      author,
      date: toSortableDatetime(createdAt),
    }
  }

  getStats() {
    return {
      totalTweets: this.totalTweets,
      numOriginal: this.seenIds.size
    }
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
async function main() {
  const args = minimist(process.argv.slice(2)) as any

  let analyzer = createMorphAnalyzerSync()
  let extractor = new TwitterStreamingDocExtracor()
  // if (args.ignoreErrors) {
  //   reader.ignoreErrors = true
  // }
  // let i = 0
  // let numUsable = 0
  await linesBackpressedStdPipeable((line, writer) => {
    let doc = extractor.feed(line)
    if (doc) {
      if (args.plaintext) {
        console.log(doc.paragraphs.join('\n'))
        console.log()
      }
      // processDoc(doc, '', '', analyzer)
    }
  })
  console.error(extractor.getStats())
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}

