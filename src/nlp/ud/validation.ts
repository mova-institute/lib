import { Token } from '../token'
import { toUd, udFeatures2conlluString } from './tagset'
// import { mu } from '../../mu'
// import { MorphInterp } from '../morph_interp'
// import { tokenStream2plaintextString, tokenStream2sentences } from '../utils'



////////////////////////////////////////////////////////////////////////////////
export function validateSentence(sentence: Token[]) {
  let problems = []

  const reportIfNot = (msg: string, fn: (x: Token, i?: number) => boolean) => {
    let bads = sentence.filter(fn)
    if (bads.length) {
      problems.push(msg)
    }
  }

  if (sentence.every(x => x.relation !== 'obj')) {
    reportIfNot('не буває iobj без obj',
      x => x.relation === 'iobj')
  }

  reportIfNot('Punct receives punct or goeswith only',
    x => x.interp0().isPunctuation() && !['punct', 'goeswith', 'discourse'].includes(x.relation))

  reportIfNot('fixed, flat не можуть вказувати ліворуч',
    (x, i) => ['fixed', 'flat'].includes(x.relation) && x.head > i)

  reportIfNot('cc не може вказувати ліворуч',
    (x, i) => ['cc'].includes(x.relation) && x.head < i)

  reportIfNot('case не може вказувати праворуч',
    (x, i) => ['case'].includes(x.relation) && x.head < i)

  reportIfNot('до б(би) йде aux',
    x => ['б', 'би'].includes(x.form.toLowerCase()) && !['fixed', 'aux'].includes(x.relation))

  reportIfNot('не/ні підключається advmod’ом',
    x => ['не', 'ні'].includes(x.form.toLowerCase()) && !['advmod', undefined].includes(x.relation))

  reportIfNot('до DET не йде amod',
    x => toUd(x.interp0()).pos === 'DET' && x.relation === 'amod')

  reportIfNot('до сурядного сполучника на початку речення йде cc',
    (x, i) => i === 0 && x.interp0().isCoordinating() && !['cc'].includes(x.relation))


  /*

    reportFound('',
      x => )

  */
  return problems
}

