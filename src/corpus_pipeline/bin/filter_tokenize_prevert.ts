#!/usr/bin/env node

import { conlluStrAndMeta2vertical } from '../tovert'
import { ZvisusilDocFilter } from '../filter'
import { linesBackpressedStdPipeable, writeLines } from '../../utils.node'
import { makeObject, renprop, mapInplace } from '../../lang'
import { PrevertDocBuilder } from '../prevert_doc_builder'
import { UdpipeApiClient } from '../../nlp/ud/udpipe_api_client'
import { normalizeWebParaSafe, fixLatinGlyphMisspell } from '../../nlp/utils'

import * as minimist from 'minimist'
import he = require('he')



//------------------------------------------------------------------------------
interface Args {
  udpipeUrl: string
  udpipeConcurrency?: number
}

//------------------------------------------------------------------------------
async function main() {
  const args = minimist<Args>(process.argv.slice(2)) as any

  let docBuilder = new PrevertDocBuilder()
  let filter = new ZvisusilDocFilter()
  let udpipe = new UdpipeApiClient(args.udpipeUrl)

  linesBackpressedStdPipeable(async (line, writer) => {
    let doc = docBuilder.feedLine(line)
    if (!doc) {
      return
    }

    let { meta, paragraphs } = doc
    mapInplace(paragraphs, normalizeParagraph)

    let { docValid, filteredParagraphs, gapFollowerIndexes } =
      filter.filter(paragraphs, meta)
    if (!docValid || !filteredParagraphs.length) {
      return
    }

    if (!meta || !meta.length) {
      console.error(`No meta!`)
      return
    }

    let metaObj = makeObject(meta)
    normalizeMeta(metaObj)

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
        meta: metaObj as any,
        formOnly: true,
        pGapIndexes: gapFollowerIndexes,
      })

    writeLines(vertStream, writer)
  })
}

//------------------------------------------------------------------------------
function normalizeMeta(meta) {
  renprop(meta, 'id', 'spider_id')
  meta.title = meta.title || '[без назви]'
  meta.source = 'загальний інтернет'
}

//------------------------------------------------------------------------------
function normalizeParagraph(p: string) {
  let ret = he.unescape(p)
  ret = normalizeWebParaSafe(p)
  ret = fixLatinGlyphMisspell(ret)
  ret = ret.trim()

  return ret
}

////////////////////////////////////////////////////////////////////////////////
if (require.main === module) {
  main().catch(e => console.error(e))
}
