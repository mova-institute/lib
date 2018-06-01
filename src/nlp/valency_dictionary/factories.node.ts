import { LETTER_UK_UPPERCASE, LETTER_UK_LOWERCASE } from '../static'
import { ValencyDict, ValencyCase } from './valency_dictionary'
import { mu } from '../../mu'
import { r } from '../../lang'
import { linesSync } from '../../utils.node'
import * as path from 'path'
import { removeAccent } from '../utils'



//------------------------------------------------------------------------------
const formsRe = new RegExp(r`[${LETTER_UK_UPPERCASE}'#]{2,}`, 'g')
const nounVerbFormsRe = new RegExp(r`[${LETTER_UK_LOWERCASE}'#]{2,}`, 'g')

////////////////////////////////////////////////////////////////////////////////
export function createValencyDictFromKotsybaTsvs(directory: string) {
  let ret = new ValencyDict()

  let it = createTsvIt(path.join(directory, 'verb.tsv'))
  for (let [i, cols] of it) {
    let forms = cols[2].match(formsRe)
    if (!forms) {
      throw new Error(`Cannot parse form column at line ${i}: "${cols[2]}"`)
    }

    forms = forms.map(x => normalizeForm(x))
    let trans = decodeTransitivity(cols[13])
    forms.forEach(x => ret.valencies.get(x).addAll(trans))
  }
  // console.error(`read dict with ${ret.valencies.size} entries`)

  it = createTsvIt(path.join(directory, 'noun.tsv'))
  for (let [, cols] of it) {

    let forms = cols[1].match(formsRe).map(x => normalizeForm(x))
    let baseVerbs = removeAccent(cols[4])
      .match(nounVerbFormsRe)
      .map(x => x.replace(/#/g, ''))

    if (baseVerbs.some(x => ret.hasVerb(x))) {
      forms.forEach(x => ret.gerund2verb.get(x).addAll(baseVerbs))
    }
  }

  it = createTsvIt(path.join(directory, 'noun-overlay.tsv'))
  for (let [, [form, valencyStr]] of it) {
    ret.nounOverlayValencies.get(form).addAll(decodeTransitivity(valencyStr))
  }
  // console.error(ret.buildStats())

  return ret
}

//------------------------------------------------------------------------------
function removePoundAccent(val: string) {
  return val.replace(/#/g, '')
}

//------------------------------------------------------------------------------
function normalizeForm(val: string) {
  return removePoundAccent(val).toLowerCase()
}

//------------------------------------------------------------------------------
function createTsvIt(filePath: string) {
  return mu(linesSync(filePath))
    .map(x => x.trim())
    .filter(x => x)
    .drop()
    .map(x => x.split('\t'))
    .entries()
}

//------------------------------------------------------------------------------
function decodeTransitivity(val: string) {
  if (val.startsWith('0') || !val.trim()) {
    return [ValencyCase.intransitive]
  }
  if (val === 'acc_opt' || val.startsWith('acc|') || val === '?') {
    // return Valency.optional
    return [ValencyCase.accusative, ValencyCase.intransitive]
  }
  if (/^acc($|:|&|_)/.test(val)) {
    return [ValencyCase.accusative]
  }
  if (val === 'noun') {
    return [ValencyCase.intransitive]
  }

  throw new Error(`Cannot parse "${val}" as transitivity value`)
}
