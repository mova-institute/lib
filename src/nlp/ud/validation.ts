import { Token } from '../token'
import { toUd, UdPos } from './tagset'
import { UdMiRelation } from './syntagset'
import { mu } from '../../mu'
import { GraphNode, walkDepth } from '../../lib/graph'
import { MorphInterp } from '../morph_interp'
import { Pos } from '../morph_features'
import { last } from '../../lang'



class SentenceToken extends Token {
  index: number
}

const ALLOWED_RELATIONS: UdMiRelation[] = [
  'acl',
  'advcl',
  'advmod',
  'amod',
  'appos',
  'aux:pass',
  'aux',
  'case',
  'cc',
  'ccomp',
  'compound:svc',
  'compound',
  'conj:parataxis',
  'conj:repeat',
  'conj',
  'cop',
  'csubj:pass',
  'csubj',
  'det:numgov',
  'det:nummod',
  'det',
  'discourse',
  'dislocated',
  'expl',
  'fixed',
  'flat:foreign',
  'flat:name',
  'flat:title',
  'flat',
  'goeswith',
  'iobj',
  'iobj:mark',
  'list',
  'nsubj:mark',
  'obj:mark',
  'obl:mark',
  'mark',
  'nmod',
  'nsubj:pass',
  'nsubj',
  'nummod:gov',
  'nummod',
  'obj',
  'obl:agent',
  'obl',
  'orphan',
  'parataxis',
  'punct',
  'reparandum',
  'root',
  'vocative',
  'xcomp',
]

export const CORE_COMPLEMENTS = [
  'obj',
  // 'xcomp',
  'ccomp',
  'obj:mark',
]

const COMPLEMENTS = [
  ...CORE_COMPLEMENTS,
  'iobj',
]

const OBLIQUES = [
  'obl',
  'obl:agent',
  'obl:mark',
]

const SUBJECTS = [
  'nsubj',
  'nsubj:pass',
  'csubj',
  'csubj:pass',
  'csubj:mark',
]

const NOMINAL_HEAD_MODIFIERS = [
  'nmod',
  'appos',
  'amod',
  'nummod',
  'nummod_gov',
  'acl',
  'det',
  'case',
  'punct',
  'conj',
  'cc',
  'advmod',
  'discourse',
]

const LEAF_RELATIONS = [
  'cop',
  'expl',
  'fixed',
  // 'flat',
  'goeswith',
  'punct',
]

const LEFT_RELATIONS = [
  // 'case',  // treated separately
  'cc',
  'reparandum',
]

const RIGHT_RELATIONS = [
  'appos',
  'conj',
  // 'dislocated',
  'fixed',
  'flat',
  'flat:foreign',
  'flat:name',
  'list',
  // 'parataxis',
]

const POS_ALLOWED_RELS = {
  // 'DET': [
  //   'det',
  //   'det:numgov',
  //   'det:nummod',
  //   'iobj:mark',
  //   'nsubj:mark',
  //   'obj:mark',
  //   'obl:mark',
  // ],
  // 'PUNCT': [
  //   'punct',
  //   'goeswith',
  //   'discourse',
  // ],
  // 'SCONJ': [
  //   'mark',
  // ],
  // 'NUM': [
  //   'nummod',
  //   'nummod:gov',
  //   'compound',
  //   'flat',
  //   'appos',
  //   'conj',
  // ],
}

const NON_SCONJ_RELS = [
  'iobj:mark',
  'nsubj:mark',
  'obj:mark',
  'obl:mark',
]

const DISCOURSE_DESTANATIONS = [
  'PART',
  'SYM',
  'INTJ',
]

const TOBE_LEMMAS = [
  'бути',
  'бувши',
  'будучи',
]

const TOBE_AND_BY_LEMMAS = [
  ...TOBE_LEMMAS,
  'б',
  'би',
]

const ADVMOD_NONADVERBIAL_LEMMAS = [
  'не',
  'ні',
  'ані',
]

const CLAUSAL_MODIFIERS = [
  'acl',
  'advcl',
  'csubj',
  'csubj:pass',
  'ccomp',
  'xcomp',
]

const EXPL_FORMS = [
  'собі',
  'воно',
  'це',
]

const CC_HEAD_RELS = [
  'conj',
  'parataxis',
  'conj:parataxis',
]

const NON_CHAINABLE_RELS = [
  'aux',
  'fixed',
]

const NEVER_CONJUNCT_POS = [
  'CCONJ',
  'PART',
  'PUNCT',
  'SCONJ',
  'AUX',
]

const CLAUSE_RELS = [
  'csubj',
  'ccomp',
  'xcomp',
  'advcl',
  'acl',
  'parataxis',
]

const CONTINUOUS_REL = [
  'csubj',
  'ccomp',
  // 'xcomp',
  'advcl',
  // 'acl',
  'parataxis',
  'flat',
  'fixed',
  'compound',
]


const POSES_NEVER_ROOT: UdPos[] = [
  // 'ADP',
  'AUX',
  // 'CCONJ',
  // 'SCONJ',
  // 'NUM',
  // 'PART',
  'PUNCT',
]


const SIMPLE_RULES: [string, string, SentencePredicate2, string, SentencePredicate2][] = [
  [`case`, `з іменника`,
    t => isNounishOrElliptic(t) || t.interp.isAdjective() && t.interp.isPronoun() || t.isPromoted && t.interp.isCardinalNumeral(),
    `в прийменник`,
    (t, s, i) => t.interp.isPreposition() || s.some(t2 => t2.head === i && uEq(t2.rel, 'fixed'))],
  [`det:`,
    `з іменника`,
    (t, s, i) => isNounishOrElliptic(t) || s.some(tt => tt.rel === 'acl' || tt.head === i) || t.tags.includes('adjdet'),
    `в нечислівниковий DET`,
    t => toUd(t.interp).pos === 'DET' && !t.interp.isCardinalNumeral() && !t.interp.isOrdinalNumeral()],
  [`amod`, `з іменника`, t => isNounishOrElliptic(t), `в прикметник`, t => t.interp.isAdjectivish()],
  [`nmod`, `з іменника`, t => isNounishOrElliptic(t), `в іменник`, t => isNounishOrElliptic(t)],
  [`nummod`, `з іменника`, t => isNounishOrElliptic(t), `в незайменниковий числівник`, t => t.interp.isCardinalNumeral() && !t.interp.isPronoun()],
  [`det:numgov`, `з іменника`, t => isNounishOrElliptic(t), `в займенниковий числівник`, t => t.interp.isCardinalNumeral() && t.interp.isPronoun()],
  [`punct`, `з content word`, t => !t /*temp*/ || isContentWord(t) || t.tags.includes('nestedpunct'), `в PUNCT`, t => t.interp.isPunctuation()],
  [`discourse`, undefined, undefined, `в ${DISCOURSE_DESTANATIONS.join('|')} чи fixed`, (t, s, i) => DISCOURSE_DESTANATIONS.includes(toUd(t.interp).pos) || s[i + 1] && s[i + 1].rel === 'fixed'],
  [`aux`, `з дієслівного`, t => t.interp.isVerbial(), `в бути|би|б`, t => TOBE_AND_BY_LEMMAS.includes(t.interp.lemma)],
  [`cop`, `з недієслівного`, (t, s, i) => !t.interp.isVerb() && !t.interp.isConverb() && !isActualParticiple(t, s, i), `в бути`, t => TOBE_LEMMAS.includes(t.interp.lemma)],
  [`nsubj:`,
    `з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `в іменникове`,
    t => isNounishOrElliptic(t)],
  ['nsubj:mark',
    `з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `у вказівний`,
    t => t.interp.isDemonstrative()],
  [`obj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменникове`, t => isNounishOrElliptic(t)],
  [`iobj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменникове`, t => isNounishOrElliptic(t)],
  [`obl`, `з присудка`, (t, s, i) => canBePredicate(t, s, i) || t.interp.isAdjective(), `в іменник`, t => isNounishOrElliptic(t)],
  [`obl:agent`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменник`, t => isNounishOrElliptic(t)],
  [`vocative`,
    `з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `в кличний/називний іменник`,
    t => t.interp.isForeign() || isNounishOrElliptic(t) && (t.interp.isVocative() || t.interp.isNominative())],
  [`advmod`, ``, t => 0, `в прислівник`, t => t.interp.isAdverb() || t.interp.isParticle() && ADVMOD_NONADVERBIAL_LEMMAS.includes(t.interp.lemma)],
  [`expl`,
    `з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `в ${EXPL_FORMS.join('|')} — іменники`,
    t => EXPL_FORMS.includes(t.form) && t.interp.isNounish()],
  [`mark`, ``, t => t, `в SCONJ|ADV`, t => toUd(t.interp).pos === 'SCONJ' || t.interp.isAdverb()/*todo*/],
  [`flat:name`, `з іменника`, t => t.interp.isNounish(), ``, t => t],
  [`csubj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`ccomp`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`xcomp`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`advcl`, ``, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],

  [`cc`, ``, (t, s, i) => t, `в сурядний`, t => t.interp.isCoordinating()],  // окремо
  [`acl`, `з іменника`, t => isNounishOrElliptic(t) || t.interp.isDemonstrative(), ``, t => t],

  [`appos`, `з іменника`, t => isNounishOrElliptic(t), `в іменник`, t => isNounishOrElliptic(t)],
]

////////////////////////////////////////////////////////////////////////////////
export interface Problem {
  message: string
  indexes: number[]
}

type SentencePredicate = (x: Token, i?: number) => any
type SentencePredicate2 = (t: Token, s?: Token[], i?: number) => any
type TreedSentencePredicate = (t: GraphNode<Token>, i?: number) => any
////////////////////////////////////////////////////////////////////////////////
export function validateSentenceSyntax(sentence: Token[]) {

  let problems = new Array<Problem>()

  let treedSentence = sentenceArray2TreeNodes(sentence)
  let roots = treedSentence.filter(x => x.isRoot())
  let sentenceHasOneRoot = roots.length === 1
  let node2index = new Map(treedSentence.map((x, i) => [x, i] as [GraphNode<Token>, number]))

  const reportIf = (message: string, fn: SentencePredicate) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const treedReportIf = (message: string, fn: TreedSentencePredicate) => {
    problems.push(...mu(treedSentence).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const xreportIf = (...args: any[]) => undefined

  const hasDependantWhich = (i: number, fn: SentencePredicate) =>
    sentence.some((xx, ii) => xx.head === i && fn(xx, ii))


  // ~~~~~~~ rules ~~~~~~~~

  // invalid roots
  if (sentenceHasOneRoot) {
    let udPos = toUd(roots[0].node.interp).pos
    if (POSES_NEVER_ROOT.includes(udPos)) {
      problems.push({ indexes: [node2index.get(roots[0])], message: `${udPos} як корінь` })
    }
  }

  // invalid AUX
  treedReportIf(`AUX без cop/aux`, (t, i) =>
    t.node.interp.isAuxillary()
    && t.parent
    && !['cop', 'aux'].some(x => uEq(t.node.rel, x))
  )

  // simple rules
  for (let [rel, messageFrom, predicateFrom, messageTo, predicateTo] of SIMPLE_RULES) {
    let relMatcher = rel.endsWith(':')
      ? (x: string) => x === rel.slice(0, -1)
      : (x: string) => x === rel || x && x.startsWith(`${rel}:`)

    let relName = rel.endsWith(':') ? `${rel} без двокрапки` : rel

    if (messageFrom && predicateFrom) {
      reportIf(`${relName} не ${messageFrom}`, (t, i) => relMatcher(t.rel) && !sentence[t.head].interp0().isForeign() && !predicateFrom(sentence[t.head], sentence, t.head))
    }
    if (messageTo && predicateTo) {
      reportIf(`${relName} не ${messageTo}`, (t, i) => relMatcher(t.rel) && !t.interp0().isForeign() && !predicateTo(t, sentence, i))
    }
  }

  reportIf(`токен позначено #error`, (t, i) => t.tags.includes('error'))

  reportIf('більше однієї стрілки в слово',
    tok => tok.deps.length > 1 && mu(tok.deps).count(x => x.relation !== 'punct'))

  RIGHT_RELATIONS.forEach(rel => reportIf(`${rel} ліворуч`, (tok, i) => tok.rel === rel && tok.head > i))
  LEFT_RELATIONS.forEach(rel => reportIf(`${rel} праворуч`, (tok, i) => tok.rel === rel && tok.head < i))

  reportIf(`case праворуч*`, (t, i) => uEq(t.rel, 'case')
    && t.head < i
    && !(sentence[i + i] && sentence[i + 1].interp.isCardinalNumeral())
  )

  reportIf('невідома реляція',
    t => t.rel && !ALLOWED_RELATIONS.includes(t.rel as UdMiRelation))

  // Object.entries(POS_ALLOWED_RELS).forEach(([pos, rels]) =>
  //   reportIf(`не ${rels.join('|')} в ${pos}`,
  //     x => x.rel
  //       && !x.isPromoted
  //       && toUd(x.interp).pos === pos
  //       && !rels.includes(x.rel)))


  reportIf(`punct в двокрапку зліва`,
    (t, i) => t.form === ':'
      && t.interp.isPunctuation()
      && t.head < i)

  xreportIf(`у залежника ccomp немає підмета`,
    (t, i) => t.relation === 'ccomp'
      && !t.isPromoted
      && !sentence.some(xx => SUBJECTS.includes(xx.rel) && xx.head === i))

  reportIf(`у залежника xcomp є підмет`,
    (t, i) => uEq(t.rel, 'xcomp')
      && sentence.some(x => SUBJECTS.includes(x.rel) && x.head === i))

  reportIf('не discourse до частки',
    t => t.rel
      && !['б', 'би', 'не'].includes(t.form.toLowerCase())
      && t.interp.isParticle()
      && !['discourse', 'fixed'])

  xreportIf('не aux у б(би)',
    t => ['б', 'би'].includes(t.form.toLowerCase())
      && t.interp.isParticle()
      && !['fixed', 'aux', undefined].includes(t.relation))

  reportIf('не advmod в не',
    t => t.interp.isParticle()
      && ['не', /*'ні', 'лише'*/].includes(t.form.toLowerCase())
      && !['advmod', undefined].includes(t.rel))

  reportIf('не cc в сурядий на початку речення',
    (t, i) => t.rel && i === 0 && t.interp.isCoordinating() && !['cc'].includes(t.rel))

  var predicates = new Set<number>()
  sentence.forEach((x, i) => {
    if (CORE_COMPLEMENTS.includes(x.rel)) {
      if (predicates.has(x.head)) {
        problems.push({ indexes: [x.head], message: `у присудка більше ніж один прямий додаток (${CORE_COMPLEMENTS.join('|')})` })
      } else {
        predicates.add(x.head)
      }
    }
  })

  let predicates2 = new Set<number>()
  sentence.forEach((x, i) => {
    if (SUBJECTS.includes(x.rel)) {
      if (predicates2.has(x.head)) {
        problems.push({ indexes: [x.head], message: `у присудка більше ніж один підмет (${SUBJECTS.join('|')})` })
      } else {
        predicates2.add(x.head)
      }
    }
  })

  reportIf('obj/iobj має прийменник',
    (t, i) => ['obj', 'iobj'].includes(t.rel) && sentence.some(xx => uEq(xx.rel, 'case') && xx.head === i))

  xreportIf(`:pass-реляція?`,
    t => !t.isPromoted
      && ['aux', 'csubj', 'nsubj'].includes(t.rel)
      && sentence[t.head]
      && isPassive(sentence[t.head].interp))  // todo: навпаки

  xreportIf(`:obl:agent?`,
    (t, i) => !t.isPromoted
      && t.rel === 'obl'
      && t.interp.isInstrumental()
      && isPassive(sentence[t.head].interp)
      && !hasDependantWhich(i, xx => uEq(xx.rel, 'case')))

  LEAF_RELATIONS.forEach(leafrel => treedReportIf(`${leafrel} має залежників`,
    (t, i) => uEq(t.node.rel, leafrel)
      && !t.children.every(x => x.node.interp.isPunctuation()))
  )

  xreportIf(`obl з неприсудка`,
    (t, i) => OBLIQUES.includes(t.rel)
      && !t.isPromoted
      && !sentence.some(xx => xx.head === i && uEq(xx.rel, 'cop'))
      && !sentence[t.head].interp.isNounish()
      && !sentence[t.head].interp.isVerbial()
      && !sentence[t.head].interp.isAdjective()
      && !sentence[t.head].interp.isAdverb())

  treedReportIf(`сполучник виділено розділовим знаком`,
    (t, i) => t.node.interp.isCoordinating() && t.children.some(ch => ch.node.rel === 'punct')
  )


  // coordination

  treedReportIf(`неузгодження відмінків cполучника`,
    (t, i) => uEq(t.node.rel, 'case')
      && (t.node.interp.features.requiredCase as number) !== t.parent.node.interp.features.case
      && !t.parent.node.interp.isForeign()
      && !t.parent.children.some(xx => isNumgov(xx.node.rel))
  )

  treedReportIf(`неузгодження`,
    (t, i) => {
      if (!t.parent) {
        return
      }
      let dep = t.node.interp
      let head = t.parent.node.interp

      let ret = ['amod', 'det'].includes(t.node.rel)
        && dep.isAdjective()
        // && head.isNounish()
        && !head.isForeign()
        && !t.parent.children.some(xx => isNumgov(xx.node.rel))
        && (
          dep.features.case !== head.features.case
          || (dep.isPlural() && !head.isPlural() && !t.parent.children.some(x => x.node.rel === 'conj'))
          || (dep.isSingular() && dep.features.gender !== head.features.gender)
        )
      ret = false //////////////////////////////
      if (ret) {
        return true
      }

      // amod det nummod conj // nsubj appos acl

      // ret = ret || x.node.rel === 'nummod'
      //   && (dep.hasGender() && dep.features.gender !== head.features.gender
      //     || dep.features.case !== head.features.case
      //   )

      // ret = ret || x.node.rel === 'conj'
      //   && dep.features.pos === head.features.pos
      //   && !dep.isBeforeadj()
      //   && !x.parent.children.some(xx => isNumgov(xx.node.rel))
      //   && (dep.hasCase() && dep.features.case !== head.features.case
      //   )

      // ret = uEq(x.node.rel, 'nsubj')
      //   && head.isVerb()
      //   && (dep.features.person !== head.features.person
      //     // || dep.features.number !== head.features.number
      //   )
      return ret
    }
  )

  treedReportIf(`gov-реляція між однаковими відмінками`,
    (t, i) => isNumgov(t.node.rel)
      && t.node.interp.features.case === t.parent.node.interp.features.case
  )

  treedReportIf(`не gov-реляція між різними відмінками`,
    (t, i) => !isNumgov(t.node.rel)
      && ['nummod', 'det:nummod'].some(rel => uEq(t.node.rel, rel))
      && !t.parent.node.interp.isForeign()
      && t.node.interp.features.case !== t.parent.node.interp.features.case
  )


  // continuity/projectivity

  for (let token of treedSentence) {
    if (CONTINUOUS_REL.some(x => uEq(token.node.rel, x))) {
      let rootFromHere = token.root()

      let indexes = mu(walkDepth(token))
        .map(x => node2index.get(x))
        .toArray()
        .sort((a, b) => a - b)
      let holes = findHoles(indexes)
        .filter(i => treedSentence[i].root() === rootFromHere)

      if (holes.length) {
        // console.error(sentence.map(x => x.form).join(' '))
        // console.error(indexes)
        // console.error(holes)
        problems.push({ indexes: holes, message: `чужі токени всередині ${token.node.rel}` })
      }
    } else if (uEq(token.node.rel, 'cc')) {
      // cc тільки з того, в що увіходив conj чи з кореня
    }
  }

  let lastToken = last(treedSentence)
  // /*/^[\.\?!…]|...$/.test(lastToken.node.form)*/
  if (lastToken.node.interp.isPunctuation()) {
    if (sentenceHasOneRoot) {
      let nonRootParents = lastToken.parents.filter(x => !x.isRoot())
      if (nonRootParents.length
        && nonRootParents.some(x => !x.node.interp.isAbbreviation())
        && !lastToken.ancestors0().filter(x => !x.isRoot()).some(
          x => uEq(x.node.rel, 'parataxis') || x.node.rel.endsWith(':parataxis'))) {
        problems.push({
          indexes: [treedSentence.length - 1],
          message: `останній розділовий не з кореня`,
        })
      }
    }
  }

  // зробити: в AUX не входить cop/aux
  // зробити: остання крапка не з кореня
  // зробити: коми належать підрядним: Подейкують,

  // treedReportIf(`bubu`,
  //   (t, i) => t.node.rel === 'nmod' && t.parent.node.rel === 'nmod'
  //     && !t.children.some(x => x.node.interp.isPreposition())
  //     && !t.node.interp.isGenitive()
  // )


  /*

    treedReportIf(``,
      (t, i) =>
    )

  */


  return problems
}

//------------------------------------------------------------------------------
function findHoles(array: Array<number>) {
  let ret = new Array<number>()
  if (array.length < 3) {
    return ret
  }
  for (let i = 1; i < array.length; ++i) {
    for (let j = 1; j < array[i] - array[i - 1]; ++j) {
      ret.push(array[i - 1] + j)
    }
  }

  return ret
}

//------------------------------------------------------------------------------
function uEq(rel: string, unirel: string) {
  return rel === unirel || rel && rel.startsWith(`${unirel}:`)
}

//------------------------------------------------------------------------------
function isContentWord(token: Token) {
  if (token.isPromoted) {
    return true
  }
  // const CONTENT_WORD_POSES = [Pos.adjective, Pos.adverb, Pos.]
  const FUNCTION_WORD_POSES = [Pos.conjunction, Pos.particle, Pos.punct]
  return !FUNCTION_WORD_POSES.includes(token.interp.features.pos) && !token.interp.isAuxillary()
}

//------------------------------------------------------------------------------
function isNumgov(relation: string) {
  return relation === 'nummod:gov' || relation === 'det:numgov'
}

//------------------------------------------------------------------------------
function isPassive(interp: MorphInterp) {
  return /*interp.isImpersonal() ||*/ interp.isPassive()
}

//------------------------------------------------------------------------------
function getSubtree(i: number, childrenMap: number[][]) {
  let ret = [i, ...childrenMap[i]]
  childrenMap[i].forEach(x => ret.push(...getSubtree(x, childrenMap)))
  return [...new Set(ret)].sort()
}

//------------------------------------------------------------------------------
function isContinuous(array: Array<number>) {
  for (let i = 1; i < array.length; ++i) {
    if (array[i] - array[i - 1] !== 1) {
      return false
    }
  }
  return true
}

//------------------------------------------------------------------------------
function canBePredicate(token: Token, sentence: Token[], index: number) {
  return token.isPromoted
    || !token.hasDeps()
    || token.interp.isInterjection()
    || token.interp.isVerb()
    || token.interp.isConverb()
    || token.interp.isAdverb()
    || (sentence.some(t => t.head === index && uEq(t.rel, 'cop'))
      && (token.interp.isNounish() || token.interp.isAdjective())
      && (token.interp.isNominative() || token.interp.isInstrumental() || token.interp.isLocative())
    )
    || ((token.interp.isNounish() || token.interp.isAdjective()) && token.interp.isNominative())
    || CLAUSAL_MODIFIERS.includes(token.rel)
}

//------------------------------------------------------------------------------
function isNounishOrElliptic(token: Token) {
  return token.interp.isNounish()
  || token.isPromoted && (token.interp.isAdjectivish() || token.interp.isCardinalNumeral())
}

//------------------------------------------------------------------------------
function isNounishEllipticOrMeta(node: GraphNode<Token>) {
  return isNounishOrElliptic(node.node) || isEncolsedInQuotes(node)
}

//------------------------------------------------------------------------------
function isActualParticiple(token: Token, sentence: Token[], index: number) {
  return token.interp.isParticiple() && ['obl:agent', /*'advcl', 'obl', 'acl', 'advmod'*/].some(x => sentence.some(xx => xx.head === index && xx.rel === x))
}

//------------------------------------------------------------------------------
function sentenceArray2TreeNodes(sentence: Token[]) {
  // return mu(sentence)
  //   .map(x => new TreeNode(x))
  //   .transform((x, i) => {
  //   if (x.node.head) {
  //     nodeArray[i].parent = nodeArray[sentence[i].head]
  //     nodeArray[sentence[i].head].children.push(nodeArray[i])
  //   }
  // })
  let nodeArray = sentence.map(x => new GraphNode(x))
  for (let i = 0; i < nodeArray.length; ++i) {
    if (sentence[i].rel) {
      nodeArray[i].parents.push(nodeArray[sentence[i].head])
      nodeArray[sentence[i].head].children.push(nodeArray[i])
    }
  }

  return nodeArray
}

//------------------------------------------------------------------------------
function isEncolsedInQuotes(node: GraphNode<Token>) {
  let ret = node.children.length > 2
    && node.children[0].node.interp.isPunctuation()
    && last(node.children).node.interp.isPunctuation()
    && /^["«‘‛“„]$/.test(node.children[0].node.form)
    && /^["»’”‟]$/.test(last(node.children).node.form)

  return ret
}
