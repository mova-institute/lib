import * as fs from 'fs'
import { join } from 'path'
import { sync as globSync } from 'glob'
import { mu } from '../mu'
import { parseXmlFileSync } from '../xml/utils.node'
import { linesStreamSync } from '../utils.node'
import { tei2tokenStream } from '../nlp/utils'
import { iterateDictCorpVizLines } from '../nlp/vesum_utils'
import { NS } from '../xml/utils'
import { startsWithCapital } from '../string_utils'
import { MorphInterp } from '../nlp/morph_interp'
import { sync as mkdirpSync } from 'mkdirp'


export interface Args {
  corpusPath: string
  outPath: string
  vesumPath: string
}

export function build4TreeTagger(args: Args) {
  mkdirpSync(args.outPath)
  let trainFile = fs.openSync(join(args.outPath, 'train.txt'), 'w')
  let lexicon = new Set<string>()

  console.log(`Building 2+1…`)
  let newStandardFiles = globSync(join(args.corpusPath, '*.xml'))
  mu(newStandardFiles)
    .map(x => parseXmlFileSync(x))
    .map(x => mu(tei2tokenStream(x)))
    .forEach(x => x.forEach(tok => {
      if (tok.isWord()) {
        let interp = tok.interps[0]
        if (isJohojiji(interp)) {
          interp = MorphInterp.fromVesumStr('noun:n:v_rod:&pron:pers:3', interp.lemma)
        }
        fs.writeSync(trainFile, `${tok.form}\t${interp.toMte()}\n`)
        if (!startsWithCapital(interp.lemma)) {
          tok.form = tok.form.toLowerCase()
        }
        if (!/^\d+$/.test(tok.form) && !interp.isPunctuation() && !interp.isX()) {
          lexicon.add(`${tok.form}\t${interp.toMte()} ${interp.lemma}`)
        }
      }
    }))

  console.log(`Building depechemode…`)
  parseXmlFileSync(join(args.corpusPath, 'old_standard', 'serhii_zhadan__depesh_mod.xml'))
    .evaluateElements('//tei:body//tei:w|//tei:body//tei:pc', NS)
    .forEach(el => {
      // console.error(el.text())
      let form = el.text()
      if (el.localName() === 'pc') {
        var lemma = form
        var tag = 'U'
      } else {
        lemma = el.attribute('lemma')
        tag = el.attribute('ana')
      }
      fs.writeSync(trainFile, `${form}\t${tag}\n`)
      if (!startsWithCapital(lemma)) {
        form = form.toLowerCase()
      }
      if (!/^(Md|X|U)/.test(tag)) {
        lexicon.add(`${form}\t${tag} ${lemma}`)
      }
    })

  console.log(`Building lexicon…`)
  let lines = iterateDictCorpVizLines(linesStreamSync(args.vesumPath))
  for (let line of lines) {
    let interp = MorphInterp.fromVesumStr(line.tag, line.lemma, line.lemmaTag)
    if (isJohojiji(interp)) {
      continue
    }
    lexicon.add(`${line.form}\t${interp.toMte()} ${interp.lemma}`)
  }

  console.log(`Sorting lexicon…`)
  let array = [...lexicon]
  lexicon = undefined
  const collator = new Intl.Collator('uk-dict-UA', {
    sensitivity: 'base',
  })
  array.sort(collator.compare)

  console.log(`Writing lexicon…`)
  fs.writeFileSync(join(args.outPath, 'lexicon.txt'), array.join('\n'))
}

//------------------------------------------------------------------------------
function isJohojiji(interp: MorphInterp) {
  return (interp.lemma === 'його' || interp.lemma === 'її') && interp.isAdjective() && interp.isPronoun()
}
