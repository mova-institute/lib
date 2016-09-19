#!/usr/bin/env node

import { ioArgsPlain } from '../../cli_utils'
import { unique } from '../../algo'
import { MorphInterp } from '../../nlp/morph_interp'
import { VesumLineDescriptor } from '../../nlp/vesum/vesum_line_descriptor'
import { VesumLexemeIterator } from '../../nlp/vesum/vesum_lexeme_iterator'
import { createInterface } from 'readline'



ioArgsPlain(async (input, output) => {
  let it = new VesumLexemeIterator()
  const rl = createInterface({ input, output })
  rl.on('line', line => {
    let lexeme = it.feedLine(line)
    if (lexeme) {
      writeLexeme(lexeme, output)
    }
  }).on('close', () => {
    writeLexeme(it.flush(), output)
  })
})

//------------------------------------------------------------------------------
function writeLexeme(lexeme: VesumLineDescriptor[], output) {
  let mteLinesLexeme = lexeme.map(x => {
    let ret = ''
    if (!x.isLemma) {
      ret += '  '
    }
    ret += x.form + ' '
    ret += MorphInterp.fromVesumStr(x.tag, undefined, x.lemmaTag).setLemma(x.lemma).toMte()
    return ret
  })
  mteLinesLexeme = unique(mteLinesLexeme)
  output.write(mteLinesLexeme.join('\n') + '\n')
}
