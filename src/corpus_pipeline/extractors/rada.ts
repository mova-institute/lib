import { CorpusDoc } from '../doc_meta'
import { dayUkmonthYear2date, toSortableDate } from '../../date'
import { clusterize } from '../../algo'
import { mapInplace } from '../../lang'
import { removeTags } from '../../xml/utils'
import { normalizeZvidusilParaNondestructive } from '../../nlp/utils'

import he = require('he')

const lineClassifiers = [
  (x) => x.startsWith('<p align=center>'),
  (x) => x.startsWith('<p>'),
  (x) => true,
]

export function extract(fileContents: string): CorpusDoc {
  /*
    Стенограма пленарного засідання
    14 листопада 1990
    <div>
    …
  */

  let [, dateUk, ...htmlLines] = fileContents.split(/\n+/)
  let date = toSortableDate(dayUkmonthYear2date(dateUk))

  let [headerPars, contentPars] = clusterize(htmlLines, (line) =>
    lineClassifiers.findIndex((x) => x(line)),
  )

  if (!contentPars) {
    // wierd format e.g. 2/19960627-1
    console.error(`skipping`)
    return
  }

  // hm…
  ;[headerPars, contentPars].forEach(
    (x) =>
      x &&
      mapInplace(x, [
        removeTags,
        he.unescape,
        normalizeZvidusilParaNondestructive,
      ]),
  )

  contentPars = contentPars.filter(
    (x) =>
      x &&
      !/^\d{2}:\d{2}:\d{2}$/.test(x) && // timestamps e.g. <p>10:59:10</p>
      !/^А-ЯІЇЄҐ]{2,} [А-ЯІЇЄҐ]\.[А-ЯІЇЄҐ]\.$/.test(x), // <p>ПИСАРЕНКО В.В.</p>
  )

  let paragraphs = new Array<string>()
  let glueNext = false
  for (let p of contentPars) {
    if (/^\d+$/.test(p)) {
      glueNext = true
      continue
    }
    // console.error(p)
    let match = p.match(
      /^((?:ГОЛОВА|ГОЛОВУЮЧИЙ|Головуючий|ГОЛОСИ? ІЗ ЗАЛУ)\.|[А-ЯІЇЄҐ]{2,} [А-ЯІЇЄҐ]\.[А-ЯІЇЄҐ]\.) (.*)/,
    )
    if (match) {
      let [, speaker, content] = match
      p = content
    }
    if (glueNext) {
      paragraphs[paragraphs.length - 1] += ' '
      paragraphs[paragraphs.length - 1] += p
      glueNext = false
    } else {
      paragraphs.push(p)
    }
  }

  return {
    source: 'Стенограми засідань ВР',
    title: `Засідання Верховної Ради ${date}`, // ~
    date,
    paragraphs,
  }
}
