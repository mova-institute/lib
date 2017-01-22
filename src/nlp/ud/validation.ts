import { Token } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
// import { mu } from '../../mu'
// import { MorphInterp } from '../morph_interp'
// import { tokenStream2plaintextString, tokenStream2sentences } from '../utils'



////////////////////////////////////////////////////////////////////////////////
export function validateSentence(sentence: Token[]) {
  const reportFound = (message: string, fn: (x: Token, i?: number) => boolean) => {
    let bads = sentence.filter(fn)
    if (bads.length) {

    }
  }

  reportFound('Punct receives punct or goeswith only',
    x => x.firstInterp().isPunctuation() && !['punct', 'goeswith'].includes(x.relation))

  reportFound('fixed, flat не можуть вказувати ліворуч',
    (x, i) => ['fixed', 'flat'].includes(x.relation) && x.head > i)

  reportFound('cc не може вказувати ліворуч',
    (x, i) => ['cc'].includes(x.relation) && x.head > i)

  reportFound('case не може вказувати праворуч',
    (x, i) => ['case'].includes(x.relation) && x.head < i)

  reportFound('до б(би) йде aux',
    x => ['б', 'би'].includes(x.form.toLowerCase()) && x.relation !== 'aux')

  reportFound('не/ні підключається advmod’ом',
    x => ['не', 'ні'].includes(x.form.toLowerCase()) && x.relation !== 'advmod')

  reportFound('до DET не йде amod',
    x => toUd(x.firstInterp()).pos === 'DET' && x.relation === 'amod')

  if (sentence.every(x => x.relation !== 'obj')) {
    reportFound('не буває iobj без obj',
      x => x.relation === 'iobj')
  }

  /*

    reportFound('',
      x => )

  */

}

