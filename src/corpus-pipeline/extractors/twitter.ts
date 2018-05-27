import { logErrAndExit, linesBackpressedStdPipeable } from '../../utils.node'
import { StreamingExtractor } from '../types'
import { nameFromLoginAtDomain } from './utils'
import { toSortableDatetime } from '../../date'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'

import * as minimist from 'minimist'



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

    let tweet = parseTweet(obj)
    if (tweet.lang !== 'uk') {
      return
    }

    let {
      id,
      text,
      isTruncated,
      url,
      login,
      createdAt,
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

    let author = nameFromLoginAtDomain(login, 'twitter.com')

    return {
      paragraphs,
      title: '',  // todo
      source: 'Твітер',
      url,
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

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function parseTweet(tweet) {
  let cur = tweet
  if (cur.retweeted_status) {
    cur = cur.retweeted_status
  }

  let id = cur.id_str as string
  let url = `https://twitter.com/statuses/${id}`
  let login = cur.user.screen_name
  let name = cur.user.name
  let text: string = cur.extended_tweet && cur.extended_tweet.full_text
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

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
class JsonObjectLogReader {
  private buf = ''
  private lineN = 0
  private ignoreErrors = false

  feed(line: string) {
    ++this.lineN
    this.buf += line
    if (line === '}') {
      try {
        var ret = JSON.parse(this.buf)
      } catch (e) {
        console.error(`Error at line ${this.lineN}`)
        // console.error(this.buf)
        if (this.ignoreErrors) {
          this.buf = ''
          return
        }
        throw e
      }
      this.buf = ''
      return ret
    } else {
      this.buf += '\n'
    }
  }

  setIgnoreErrors(value = true) {
    this.ignoreErrors = value
  }
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
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
      // processDoc(doc, '', '', analyzer)
      // console.log(doc)
    }
  })
  console.error(extractor.getStats())
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(logErrAndExit)
}

