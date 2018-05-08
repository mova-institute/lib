import { LETTER_UK_UPPERCASE, LETTER_UK_LOWERCASE } from '../static'
import { ValencyDict, Valency } from './valency_dictionary'
import { mu } from '../../mu'
import { r } from '../../lang'
import { linesSync } from '../../utils.node'
import * as path from 'path'
import { removeAccent } from '../utils'



const formsRe = new RegExp(r`[${LETTER_UK_UPPERCASE}'#]{2,}`, 'g')
const nounVerbFormsRe = new RegExp(r`[${LETTER_UK_LOWERCASE}'#]{2,}`, 'g')

////////////////////////////////////////////////////////////////////////////////
export function createValencyDictFromKotsybaTsvs(directory: string) {
  let ret = new ValencyDict()

  let it = createTsvIt(path.join(directory, 'verb.tsv'))
  for (let [i, line] of it) {
    let cols = line.split('\t')
    let forms = cols[2].match(formsRe)
    if (!forms) {
      throw new Error(`Cannot parse form column at line ${i}: "${cols[2]}"`)
    }

    forms = forms.map(x => normalizeForm(x))
    let trans = decodeTransitivity(cols[13])
    forms.forEach(x => ret.valencies.get(x).add(trans))
  }
  console.error(`read dict with ${ret.valencies.size} entries`)


  it = createTsvIt(path.join(directory, 'noun.tsv'))
  for (let [i, line] of it) {
    let cols = line.split('\t')

    let forms = cols[1].match(formsRe).map(x => normalizeForm(x))
    let baseVerbs = removeAccent(cols[4])
      .match(nounVerbFormsRe)
      .map(x => x.replace(/#/g, ''))

    forms.forEach(x => ret.noun2verb.get(x).addAll(baseVerbs))
  }

  return ret
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function removePoundAccent(val: string) {
  return val.replace(/#/g, '')
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function normalizeForm(val: string) {
  return removePoundAccent(val).toLowerCase()
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function createTsvIt(path: string) {
  return mu(linesSync(path))
    .map(x => x.trim())
    .filter(x => x)
    .skip()
    .entries()
}

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function decodeTransitivity(val: string) {
  if (val.startsWith('0') || !val.trim()) {
    return Valency.intransitive
  }
  if (val === 'acc_opt' || val === 'acc|' || val === '?') {
    return Valency.optional
  }
  if (/^acc($|:|&|_)/.test(val)) {
    return Valency.accusative
  }

  throw new Error(`Cannot parse "${val}" as transitivity value`)
}
