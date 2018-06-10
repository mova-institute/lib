#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { ZvidusilDocFilter } from '../filter'
import { linesBackpressedStdPipeable, writeLines } from '../../utils.node'
import { makeObject, renprop, mapInplace, zip } from '../../lang'
import { PrevertDocBuilder } from '../prevert_doc_builder'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { normalizeZvidusilParaNondestructive, normalizeZvidusilParaAggressive } from '../../nlp/utils'
import { createMorphAnalyzerSync } from '../../nlp/morph_analyzer/factories.node'

import * as minimist from 'minimist'
import he = require('he')
import { prepareZvidusilMeta } from '../utils'



//------------------------------------------------------------------------------
interface Args {
  udpipeUrl: string
  udpipeConcurrency?: number
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2)) as any

  let docBuilder = new PrevertDocBuilder()
  let analyzer = createMorphAnalyzerSync()
  let filter = new ZvidusilDocFilter(analyzer)
  let udpipe = new UdpipeApiClient(args.udpipeUrl)

  linesBackpressedStdPipeable(async (line, writer) => {
    let doc = docBuilder.feedLine(line)
    if (!doc) {
      return
    }

    let { meta, paragraphs } = doc
    mapInplace(paragraphs, he.unescape)
    mapInplace(paragraphs, normalizeZvidusilParaNondestructive)

    let { docValid, filteredParagraphs, gapFollowerIndexes } =
      filter.filter(paragraphs, meta)

      if (!docValid || !filteredParagraphs.length) {
      return
    }

    if (!meta || !meta.length) {
      console.error(`No meta!`)
      return
    }

    // let [original, normalizedParas] = normalizeZvidusilParasAggressive(filteredParagraphs, analyzer)
    mapInplace(filteredParagraphs, x => normalizeZvidusilParaAggressive(x, analyzer))

    normalizeMeta(meta)
    prepareZvidusilMeta(meta)


    try {
      var conllu = await udpipe.tokenizeParagraphs(filteredParagraphs)
    } catch (e) {
      console.error(e)
      return
    }
    if (!conllu) {
      console.error(`conllu missing!`)
      return
    }

    let vertStream = conlluStrAndMeta2vertical(
      conllu, {
        meta: meta as any,
        formOnly: true,
        pGapIndexes: gapFollowerIndexes,
      })
    // todo: manage to put originals to second column
    // vertStream = addOriginalFormsToVert(vertStream, original)

    writeLines(vertStream, writer)
  })
}

//------------------------------------------------------------------------------
function* addOriginalFormsToVert(vertStream: Iterable<string>, original: string) {
  let i = 0
  for (let line of vertStream) {
    if (line.startsWith('<')) {
      yield line
      continue
    }
    if (line === '<g/>') {
      --i
      continue
    }
    let originalToken = original.substr(i, line.length)
    i += line.length + 1
    yield `${line}\t${originalToken}`
  }
}

//------------------------------------------------------------------------------
function normalizeMeta(meta) {
  renprop(meta, 'id', 'spider_id')
  meta.title = meta.title || '[без назви]'
  meta.source = 'загальний інтернет'
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
