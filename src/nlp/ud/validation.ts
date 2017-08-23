import { Token } from '../token'
import { toUd, UdPos } from './tagset'
import { UdMiRelation } from './syntagset'
import { mu } from '../../mu'
import { GraphNode, walkDepth } from '../../lib/graph'
import { MorphInterp } from '../morph_interp'
import { Pos, Person, Case } from '../morph_features'
import { last } from '../../lang'
import { uEq, uEqSome } from './utils'
import { PREDICATES, isNumericModifier, isGoverning } from './uk_grammar'
import * as grammar from './uk_grammar'


class SentenceToken extends Token {
  index: number
}

const ALLOWED_RELATIONS: UdMiRelation[] = [
  'parataxis:discourse',
  'acl:2',
  'advcl:2',
  'xcomp:2',
  'flat:repeat',
  'appos:nonnom',

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
  'list',
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
]

const COMPLEMENTS = [
  ...CORE_COMPLEMENTS,
  'iobj',
]

const OBLIQUES = [
  'obl',
  'obl:agent',
]

const SUBJECTS = [
  'nsubj',
  'csubj',
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
  'aux',
  'expl',
  'fixed',
  // 'flat',
  'goeswith',
  'punct',
]

const LEFT_POINTED_RELATIONS = [
  // 'case',  // treated separately
  'cc',
  'reparandum',
]

const RIGHT_POINTED_RELATIONS = [
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

const DISCOURSE_DESTANATIONS = [
  'PART',
  'SYM',
  'INTJ',
  'ADV',  // temp
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
  'то',
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

const SUBORDINATE_CLAUSES = [
  'csubj',
  'ccomp',
  'xcomp',
  'advcl',
  'acl',
]

const MARK_ROOT_RELS = [
  ...SUBORDINATE_CLAUSES,
  'appos',
  'parataxis:discourse',
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

const MODAL_ADVS = `
важко
важливо
варт
варто
вільно
гарно
дивно
довше
дозволено
досить
достатньо
доцільно
жарко
запізно
зручніше
краще
легко
ліпше
може
можливо
можна
найкраще
найліпше
найтяжче
невільно
неефективно
неможливо
необхідно
ніяково
нормально
потрібно
правильно
приємно
реально
слід
сором
треба
цікаво
чемно
`.trim().split(/\s+/g)


const SIMPLE_RULES: [string, string, SentencePredicate2, string, SentencePredicate2][] = [

  [`det:`,
    `з іменника`,
    (t, s, i) => canActAsNoun(t) || s.some(tt => tt.rel === 'acl' || tt.headIndex === i) || t.hasTag('adjdet'),
    `в нечислівниковий DET`,
    t => toUd(t.interp).pos === 'DET' && !t.interp.isCardinalNumeral() && !t.interp.isOrdinalNumeral()],
  [`amod`, `з іменника`, t => canActAsNoun(t), `в прикметник`, t => t.interp.isAdjectivish()],
  [`nummod`, `з іменника`, t => canActAsNoun(t), `в незайменниковий числівник`, t => t.interp.isCardinalNumeral() && !t.interp.isPronoun()],
  [`det:numgov`, `з іменника`, t => canActAsNoun(t), `в займенниковий числівник`, t => t.interp.isCardinalNumeral() && t.interp.isPronoun()],
  [`punct`,
    `зі слова`,
    t => !t || !t.interp.isPunctuation() || t.hasTag('nestedpunct'),
    // t => !t /*temp*/ /*|| isContentWord(t)*/ || t.tags.includes('nestedpunct'),
    `в PUNCT`,
    t => t.interp.isPunctuation()],
  [`discourse`,
    undefined,
    undefined,
    `в ${DISCOURSE_DESTANATIONS.join('|')} чи fixed`,
    (t, s, i) => DISCOURSE_DESTANATIONS.includes(toUd(t.interp).pos) || s[i + 1] && s[i + 1].rel === 'fixed'],
  [`cop`, `з недієслівного`, (t, s, i) => !t.interp.isVerb() && !t.interp.isConverb() && !isActualParticiple(t, s, i), `в бути`, t => TOBE_LEMMAS.includes(t.interp.lemma)],
  [`obl:agent`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменник`, t => canActAsNoun(t)],
  [`vocative`,
    undefined, //`з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `в кличний іменник`,
    t => t.interp.isXForeign()
      || canActAsNoun(t) && (t.interp.isVocative() || t.hasTag('nomvoc'))],
  [`advmod`, ``, t => 0, `в прислівник`, t => t.interp.isAdverb() || t.interp.isParticle() && ADVMOD_NONADVERBIAL_LEMMAS.includes(t.interp.lemma)],
  [`expl`,
    `з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `в ${EXPL_FORMS.join('|')} — іменники`,
    t => EXPL_FORMS.includes(t.form.toLowerCase()) && t.interp.isNounish()],
  [`flat:name`, `з іменника`, t => t.interp.isNounish(), ``, t => t],
  [`csubj`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`ccomp`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`xcomp`,
    `з присудка`,
    (t, s, i) => canBePredicate(t, s, i),
    `в куди треба`,
    (t, s, i) => canBePredicate(t, s, i)
      || (t.interp.isNounish() || t.interp.isAdjective())
      && (t.interp.isNominative() || t.interp.isInstrumental())],
  [`advcl:`, ``, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],

  [`cc`,
    ``,
    (t, s, i) => t,
    `в сурядний`,
    (t, s, i) => t.interp.isCoordinating() || s.every(tt => tt.headIndex !== i || uEq(tt.rel, 'fixed'))],  // окремо

  [`appos:`, `з іменника`, t => canActAsNoun(t), `в іменник`, t => canActAsNoun(t)],
]

const TREED_SIMPLE_RULES: [string, string, TreedSentencePredicate, string, TreedSentencePredicate][] = [
  [`case`,
    `з іменника`,
    t => canActAsNounForObj(t)
      || t.isRoot() //&& todo: more than 1 root
    // || t.interp.isAdjective() && t.interp.isPronoun()
    // || grammar.PREPS_HEADABLE_BY_NUMS.includes(t.node.interp.lemma),
    ,
    `в прийменник`,
    t => t.node.interp.isPreposition() || t.children.some(t2 => uEq(t2.node.rel, 'fixed'))],

  [`mark`,
    ``, t => t,
    `в підрядний сполучник`,
    t => t.node.interp.isSubordinative()
      || t.children.length && t.children.every(x => uEq(x.node.rel, 'fixed'))],

  [`nsubj:`,
    `з присудка`,
    t => canBePredicateTreed(t),
    `в іменникове`,
    t => canActAsNounForObj(t)
  ],
  [`obj`, `з присудка`, t => canBePredicateTreed(t), `в іменникове`, t => canActAsNounForObj(t)],
  [`iobj`, `з присудка`, t => canBePredicateTreed(t), `в іменникове`, t => canActAsNounForObj(t)],
  [`obl`,
    `з дієслова|прикм.|присл`,
    t => t.node.interp.isVerbial() || t.node.interp.isAdjective() || t.node.interp.isAdverb()
      || t.node.isPromoted,
    `в іменник`, t => canActAsNounForObj(t)],
  [`nmod`, `з іменника`, t => canActAsNoun(t.node), `в іменник`, t => canActAsNounForObj(t)],
  [`aux`, `з дієслівного`, t => t.node.interp.isVerbial()
    || t.node.interp.isAdverb() && t.children.some(x => SUBJECTS.some(subj => uEq(x.node.rel, subj))),
    `в ${TOBE_AND_BY_LEMMAS.join('|')}`, t => TOBE_AND_BY_LEMMAS.includes(t.node.interp.lemma)],
  [`acl`, `з іменника`, t => canActAsNoun(t.node) || t.node.interp.isDemonstrative(),
    `в присудок`, t => t.node.interp.isVerb() && t.node.interp.isInfinitive()
      || t.children.some(x => uEqSome(x.node.rel, ['mark']))
      || t.children.some(x => (x.node.rel === 'xcomp' || uEqSome(x.node.rel, ['csubj']))
        && x.node.interp.isInfinitive())
      || hasOwnRelative(t)
      // || t.children.some(x => x.node.interp.isRelative())
      || t.node.interp.isParticiple()  // temp
  ],

]

////////////////////////////////////////////////////////////////////////////////
export interface Problem {
  message: string
  indexes: number[]
}

type SentencePredicate = (x: Token, i?: number) => any
type SentencePredicate2 = (t: Token, s: Token[], i: number/*, node: GraphNode<Token>*/) => any
type TreedSentencePredicate = (t: GraphNode<Token>, i?: number) => any
////////////////////////////////////////////////////////////////////////////////
export function validateSentenceSyntax(nodes: GraphNode<Token>[]) {

  let problems = new Array<Problem>()

  let sentence = nodes.map(x => x.node)
  let roots = nodes.filter(x => x.isRoot())
  let sentenceHasOneRoot = roots.length === 1
  let node2index = new Map(nodes.map((x, i) => [x, i] as [GraphNode<Token>, number]))

  const reportIf = (message: string, fn: SentencePredicate) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const treedReportIf = (message: string, fn: TreedSentencePredicate) => {
    problems.push(...mu(nodes).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const xtreedReportIf = (message: string, fn: TreedSentencePredicate) => undefined
  const xreportIf = (message: string, fn: SentencePredicate) => undefined

  const hasDependantWhich = (i: number, fn: SentencePredicate) =>
    sentence.some((xx, ii) => xx.headIndex === i && fn(xx, ii))


  // ~~~~~~~ rules ~~~~~~~~

  // invalid roots
  if (sentenceHasOneRoot) {
    let udPos = toUd(roots[0].node.interp).pos
    if (POSES_NEVER_ROOT.includes(udPos)) {
      problems.push({ indexes: [node2index.get(roots[0])], message: `${udPos} як корінь` })
    }
  }

  // invalid AUX
  treedReportIf(`AUX без cop/aux`, PREDICATES.isAuxWithNoCopAux)

  // simple rules
  for (let [rel, messageFrom, predicateFrom, messageTo, predicateTo] of SIMPLE_RULES) {
    let relMatcher = rel.endsWith(':')
      ? (x: string) => x === rel.slice(0, -1)
      : (x: string) => x === rel || x && x.startsWith(`${rel}:`)

    let relName = rel.endsWith(':') ? `${rel.slice(0, -1)}` : rel

    if (messageFrom && predicateFrom) {
      reportIf(`${relName} не ${messageFrom}`,
        (t, i) => relMatcher(t.rel)
          && !sentence[t.headIndex].interp0().isXForeign()
          && !predicateFrom(sentence[t.headIndex], sentence, t.headIndex))
    }
    if (messageTo && predicateTo) {
      reportIf(`${relName} не ${messageTo}`,
        (t, i) => relMatcher(t.rel)
          && !t.interp0().isXForeign()
          && !predicateTo(t, sentence, i))
    }
  }

  // treed simple rules
  for (let [rel, messageFrom, predicateFrom, messageTo, predicateTo] of TREED_SIMPLE_RULES) {
    let relMatcher = rel.endsWith(':')
      ? (x: string) => x === rel.slice(0, -1)
      : (x: string) => x === rel || x && x.startsWith(`${rel}:`)

    let relName = rel.endsWith(':') ? `${rel.slice(0, -1)}` : rel

    if (messageFrom && predicateFrom) {
      treedReportIf(`${relName} не ${messageFrom}`,
        (t, i) => relMatcher(t.node.rel)
          && !predicateFrom(t.parent))
    }
    if (messageTo && predicateTo) {
      treedReportIf(`${relName} не ${messageTo}`,
        (t, i) => relMatcher(t.node.rel)
          && !predicateTo(t))
    }
  }


  reportIf(`токен позначено error’ом`, (t, i) => t.hasTag('error'))

  reportIf('більше однієї стрілки в слово',
    tok => tok.deps.length > 1 && mu(tok.deps).count(x => x.relation !== 'punct'))

  RIGHT_POINTED_RELATIONS.forEach(rel => reportIf(`${rel} ліворуч`, (tok, i) => tok.rel === rel && tok.headIndex > i))
  LEFT_POINTED_RELATIONS.forEach(rel => reportIf(`${rel} праворуч`, (tok, i) => tok.rel === rel && tok.headIndex < i))

  reportIf(`case праворуч`, (t, i) => uEq(t.rel, 'case')
    && t.headIndex < i
    && !(sentence[i + 1] && sentence[i + 1].interp.isCardinalNumeral())
  )

  reportIf('невідома реляція',
    t => t.rel && !ALLOWED_RELATIONS.includes(t.rel as UdMiRelation))

  reportIf(`punct в двокрапку зліва`,
    (t, i) => i !== sentence.length - 1  // not last in sentence
      && t.form === ':'
      && t.interp.isPunctuation()
      && t.headIndex < i)

  xreportIf(`у залежника ccomp немає підмета`,
    (t, i) => t.rel === 'ccomp'
      && !t.isPromoted
      && !sentence.some(xx => SUBJECTS.includes(xx.rel) && xx.headIndex === i))

  treedReportIf(`у залежника xcomp є підмет`,
    t => uEq(t.node.rel, 'xcomp')
      && !t.node.isGraft
      && t.children.some(x => uEqSome(x.node.rel, SUBJECTS))
  )

  reportIf('не discourse до частки',
    t => t.rel
      && !['б', 'би', 'не'].includes(t.form.toLowerCase())
      && t.interp.isParticle()
      && !['discourse', 'fixed'])

  xreportIf('не aux у б(би)',
    t => ['б', 'би'].includes(t.form.toLowerCase())
      && t.interp.isParticle()
      && !['fixed', 'aux', undefined].includes(t.rel))

  reportIf('не advmod в не',
    t => t.interp.isParticle()
      && ['не', /*'ні', 'лише'*/].includes(t.form.toLowerCase())
      && !['advmod', undefined].includes(t.rel))

  reportIf('не cc в сурядий на початку речення',
    (t, i) => t.rel && i === 0 && t.interp.isCoordinating() && !['cc'].includes(t.rel))

  treedReportIf(`декілька підметів (${SUBJECTS.join('|')})`,
    t => t.children.filter(x => uEqSome(x.node.rel, SUBJECTS)).length > 1
  )
  treedReportIf(`декілька прямих додатків (${CORE_COMPLEMENTS.join('|')})`,
    t => t.children.filter(x => uEqSome(x.node.rel, CORE_COMPLEMENTS)).length > 1
  )
  treedReportIf(`декілька непрямих додатків`,
    t => t.children.filter(x => uEq(x.node.rel, 'iobj')).length > 1
  )
  treedReportIf(`декілька числівників`,
    t => t.children.filter(x => isNumericModifier(x.node.rel)).length > 1
  )
  treedReportIf(`декілька gov-реляцій`,
    t => t.children.filter(x => isGoverning(x.node.rel)).length > 1
  )
  treedReportIf(`декілька cc`,
    t => t.children.filter(x => uEq(x.node.rel, 'cc')).length > 1
  )
  treedReportIf(`декілька mark’ів`,
    t => t.children.filter(x => uEq(x.node.rel, 'mark')).length > 1
  )
  treedReportIf(`декілька xcomp’ів`,
    t => t.children.filter(x => uEq(x.node.rel, 'xcomp')).length > 1
  )
  treedReportIf(`декілька cop’ів`,
    t => t.children.filter(x => uEq(x.node.rel, 'cop')).length > 1
  )
  treedReportIf(`декілька прийменників`,
    t => t.children.filter(x => uEq(x.node.rel, 'case')).length > 1
  )

  reportIf('obj/iobj має прийменник',
    (t, i) => ['obj', 'iobj'].includes(t.rel) && sentence.some(xx => uEq(xx.rel, 'case') && xx.headIndex === i))

  xreportIf(`:pass-реляція?`,
    t => !t.isPromoted
      && ['aux', 'csubj', 'nsubj'].includes(t.rel)
      && sentence[t.headIndex]
      && isPassive(sentence[t.headIndex].interp))  // todo: навпаки

  xreportIf(`:obl:agent?`,
    (t, i) => !t.isPromoted
      && t.rel === 'obl'
      && t.interp.isInstrumental()
      && isPassive(sentence[t.headIndex].interp)
      && !hasDependantWhich(i, xx => uEq(xx.rel, 'case')))


  for (let leafrel of LEAF_RELATIONS) {
    treedReportIf(`${leafrel} має залежників`,
      (t, i) => uEq(t.node.rel, leafrel)
        && (['cop', 'aux'].some(x => uEq(t.node.rel, x))
          ? !t.children.every(x => x.node.interp.isPunctuation()
            || x.node.interp.lemma === 'не'
            || x.node.interp.lemma === 'б' && x.node.interp.isParticle()
            || x.node.interp.lemma === 'би' && x.node.interp.isParticle()
          )
          : !t.children.every(x => x.node.interp.isPunctuation())
        )
    )
  }

  xreportIf(`obl з неприсудка`,
    (t, i) => OBLIQUES.includes(t.rel)
      && !t.isPromoted
      && !sentence.some(xx => xx.headIndex === i && uEq(xx.rel, 'cop'))
      && !sentence[t.headIndex].interp.isNounish()
      && !sentence[t.headIndex].interp.isVerbial()
      && !sentence[t.headIndex].interp.isAdjective()
      && !sentence[t.headIndex].interp.isAdverb())

  treedReportIf(`сполучник виділено розділовим знаком`,
    (t, i) => sentence.length > 2
      && t.node.interp.isConjunction()
      && t.children.some(ch => ch.node.rel === 'punct')
      && !uEq(t.node.rel, 'conj')
  )

  treedReportIf(`підмет не в називному`,
    t => uEq(t.node.rel, 'nsubj')
      && !t.node.isGraft
      && thisOrGovernedCase(t) !== Case.nominative
      && !t.node.interp.isXForeign()
      && !t.children.some(x => uEq(x.node.rel, 'advmod')
        && x.node.interp.isAdverb()
        && grammar.QAUNTITATIVE_ADVERBS.includes(x.node.interp.lemma)
      )
  )

  treedReportIf(`додаток в називному`,
    t => ['obj', 'iobj', 'obl'].some(x => uEq(t.node.rel, x))
      && thisOrGovernedCase(t) === Case.nominative
      && !t.node.interp.isXForeign()
      && !t.node.isGraft
    // && !t.children.some(x => isNumgov(x.node.rel))
    // && !t.children.some(x => x.node.interp.isAdverb())
  )

  // disablable
  xtreedReportIf(`obl без прийменника`,
    t => t.node.rel === 'obl'
      && !t.node.isPromoted
      && !hasChildrenOfUrel(t, 'case')
      && !t.node.interp.isInstrumental()
      && !(
        (t.node.interp.isAccusative() || t.node.interp.isGenitive())
        && grammar.TEMPORAL_ACCUSATIVES.includes(t.node.interp.lemma)
      )
  )

  xtreedReportIf(`obj/obl в давальний`,
    t => uEqSome(t.node.rel, ['obj', 'obl'])
      && t.node.interp.isDative()
  )

  treedReportIf(`місцевий без прийменника`,
    t => {
      if (!t.node.rel || !t.node.interp.isLocative() || !canActAsNoun(t.node)) {
        return
      }
      let p = t
      while (p && !hasChildrenOfUrel(p, 'case')) {
        if (!['appos', 'conj', 'flat'].some(x => uEq(p.node.rel, x))) {
          return true
        } else {
          p = p.parent
        }
      }
    }
  )

  treedReportIf(`orphan не з Promoted`,
    t => uEq(t.node.rel, 'orphan')
      && !t.parent.node.isPromoted
  )

  treedReportIf(`підрядне означальне відкриває що-іменник`,
    t => uEq(t.node.rel, 'acl')
      && t.children.some(x => x.node.form.toLowerCase() === 'що' && x.node.interp.isNounish())
  )

  treedReportIf(`cc без conj`,
    t => uEq(t.node.rel, 'cc')
      && !t.parent.isRoot()
      && !uEq(t.parent.node.rel, 'conj')
      && !t.parent.children.some(x => uEq(x.node.rel, 'conj'))
  )

  // todo
  xtreedReportIf(`підрядне без сполучника`,
    t => uEqSome(t.node.rel, SUBORDINATE_CLAUSES)
      && !uEq(t.node.rel, 'xcomp')
      // && !t.parent.children[0].node.interp.isConsequential()
      && !t.children.some(x => uEq(x.node.rel, 'mark'))
      && !hasOwnRelative(t)
      // && !t.children.some(x => x.node.interp.isRelative())
      && !isInfinitive(t)
      && !(uEq(t.node.rel, 'acl') && t.node.interp.isParticiple())
      && !(uEq(t.node.rel, 'advcl') && t.node.interp.isConverb())
      && !t.node.rel.endsWith(':2')
  )

  xtreedReportIf(`зворотне має obj/iobj`,
    t => !t.isRoot()
      && uEqSome(t.node.rel, ['obj', 'iobj'])
      && t.parent.node.interp.isReversive()
      && !t.node.interp.isDative()
      && !t.node.interp.isGenitive()
      && !t.node.interp.isInstrumental()
  )


  // coordination

  treedReportIf(`неузгодження відмінків прийменника`,
    (t, i) => uEq(t.node.rel, 'case')
      && (t.node.interp.features.requiredCase as number) !== thisOrGovernedCase(t.parent)
      && !t.parent.node.interp.isXForeign()
      && !t.parent.node.isGraft
  )

  treedReportIf(`неособове має підмет`,
    t => (t.node.interp.isImpersonal() || isInfinitive(t))
      && t.children.some(x => uEqSome(x.node.rel, SUBJECTS))
      && !t.node.isPromoted
  )

  treedReportIf(`вторинна предикація не в називний/орудний прикметник`,
    t => !t.isRoot()
      && t.node.rel.endsWith(':2')
      && !t.node.interp.isAdjective()
      && !t.node.interp.isNominative()
      && !t.node.interp.isInstrumental()
      && !t.node.isGraft
  )

  xtreedReportIf(`знахідний без прийменника від недієслова`,
    t => canActAsNounForObj(t)
      && t.node.interp.isAccusative()
      && !t.isRoot()
      && !t.children.some(x => x.node.interp.isPreposition())
      && !t.parent.node.interp.isVerbial()
      && !['conj', 'flat'].some(x => uEq(t.node.rel, x))
    // && !thisOrTravelUp(t, tt =>
    //   tt.parent.node.interp.isVerbial()
    //   && tt.children.some(x => x.node.interp.isPreposition())
    // )
    // && !t.parent.node.interp.isVerbial()

  )

  if (roots.length === 1) {
    xtreedReportIf(`інфінітив — корінь`,
      t => t.isRoot()
        && isInfinitive(t)
      // && t.children.some(x => uEq(x.node.rel, 'nsubj'))
      // && !t.node.isPromoted
      // && !t.children.some(x => x.node.interp.isAuxillary() && x.node.interp.hasPerson())
    )
  }

  treedReportIf(`неузгодження підмет-присудок`,
    (t, i) => {
      if (t.isRoot()
        || t.node.hasTag('graft')
        || !uEq(t.node.rel, 'nsubj')
        || !t.parent.node.interp.isVerbial()
        || t.parent.node.interp.isImpersonal()
        || t.node.interp.isXForeign()
      ) {
        return false
      }

      let verbInterp = t.parent.node.interp
      if (verbInterp.isInfinitive()) {
        let copula = t.parent.children.find(x => uEq(x.node.rel, 'cop'))
        if (copula) {
          verbInterp = copula.node.interp
        }
      }
      let subjFeats = t.node.interp.features

      if (verbInterp.hasPerson()) {
        let subjPerson = subjFeats.person || Person.third
        if (subjPerson !== verbInterp.features.person) {
          return true
        }
      }

      if (verbInterp.hasGender()
        && !t.node.hasTag('gendisagr')
        && !t.node.interp.isPlural()
        // && !(t.node.interp.isPronoun()
        //   && subjFeats.person === Person.first || subjFeats.person === Person.second)
        && !(t.node.interp.isPronoun() && !t.node.interp.hasGender())
        && verbInterp.features.gender !== subjFeats.gender) {
        return true
      }

      if (!t.children.some(x => uEq(x.node.rel, 'conj'))
        && !(t.node.interp.isPronoun() && !t.node.interp.hasNumber())
        && verbInterp.features.number !== subjFeats.number
      ) {
        return true
      }
    }
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
        && !head.isXForeign()
        && !t.parent.node.isGraft
        && !t.parent.children.some(xx => isGoverning(xx.node.rel))
        && (
          dep.features.case !== thisOrGovernedCase(t.parent)
          || (dep.isPlural() && !head.isPlural() && !t.parent.children.some(x => x.node.rel === 'conj'))
          || (dep.isSingular() && dep.features.gender !== head.features.gender)
        )
      // ret = false //////////////////////////////
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

      return ret
    }
  )

  treedReportIf(`gov-реляція між однаковими відмінками`,
    t => isGoverning(t.node.rel)
      && t.node.interp.features.case === t.parent.node.interp.features.case
  )

  treedReportIf(`не gov-реляція між різними відмінками`,
    t => !isGoverning(t.node.rel)
      && ['nummod', 'det:nummod'].some(rel => uEq(t.node.rel, rel))
      && !t.parent.node.interp.isXForeign()
      && t.node.interp.features.case !== t.parent.node.interp.features.case
  )

  treedReportIf(`керівний числівник не в називному/знахідному`,
    t => isGoverning(t.node.rel)
      && t.node.interp.features.case !== t.parent.node.interp.features.case
      && ![Case.nominative, Case.accusative].includes(t.node.interp.features.case)
  )

  treedReportIf(`числівник керує одниною`,  // todo
    t => !t.isRoot()
      && isGoverning(t.parent.node.rel)
      && !t.node.interp.isPlural()
  )

  treedReportIf(`кероване числівником не в родовому`,
    t => {
      let governer = t.children.find(x => isGoverning(x.node.rel))
      if (!governer) {
        return
      }

      return t.node.interp.features.case !== governer.node.interp.features.case
        && !t.node.interp.isGenitive()
    }
  )

  treedReportIf(`mark не з кореня підрядного`,
    (t, i) => uEq(t.node.rel, 'mark')
      // && !t.parent.isRoot()
      && (sentenceHasOneRoot && !t.parent.node.rel
        || t.parent.node.rel
        && !uEqSome(t.parent.node.rel, MARK_ROOT_RELS)
        && !(uEq(t.parent.node.rel, 'conj')
          && SUBORDINATE_CLAUSES.some(x => uEq(t.parent.parent.node.rel, x))
        )
      )
      && !(i === 0 && t.parent.isRoot())
  )

  treedReportIf(`parataxis під’єднано сполучником`,
    t => uEq(t.node.rel, 'parataxis')
      && t.node.rel !== 'parataxis:discourse'
      && t.children.some(x => uEqSome(x.node.rel, ['cc', 'mark']))
  )

  treedReportIf(`xcomp зі сполучником`,
    t => uEq(t.node.rel, 'xcomp')
      // && t.node.rel !== 'parataxis:discourse'
      && t.children.some(x => uEqSome(x.node.rel, ['cc', 'mark']))
  )

  treedReportIf(`flat:name не для імені`,
    t => (t.node.rel === 'flat:name' || t.children.some(x => x.node.rel === 'flat:name'))
      && !t.node.interp.isName()
  )

  // todo
  xtreedReportIf(`речення з _то_ підряне`,
    t => uEqSome(t.node.rel, SUBORDINATE_CLAUSES)
      && t.children.some(x => x.node.interp.lemma === 'то')
  )

  treedReportIf(`заперечення під’єднане не до cop/aux`,
    t => {
      if (!uEq(t.node.rel, 'advmod')
        || !t.node.interp.isNegative()
        || t.parent.node.interp.isAuxillary()) {
        return
      }
      let aux = t.parent.children.find(x => x.node.interp.isAuxillary())
      if (!aux) {
        return
      }
      return node2index.get(t) < node2index.get(aux) && node2index.get(aux) < node2index.get(t.parent)
    }
  )

  treedReportIf(`parataxis:discourse в одне слово-недієслово`,
    t => t.node.rel === 'parataxis:discourse'
      && !t.children.length
      && !t.node.interp.isVerb()
  )

  xtreedReportIf(`discourse у фразу`,
    t => uEq(t.node.rel, 'discourse')
      && t.children.filter(x => !uEqSome(x.node.rel, ['fixed', 'punct'])).length
  )

  treedReportIf(`кого.Acc чому.Gen: patient не iobj?`,
    t => {
      let obj = t.children.find(x => uEq(x.node.rel, 'obj'))
      let iobj = t.children.find(x => uEq(x.node.rel, 'iobj'))
      if (obj && iobj) {
        if (obj.node.interp.isAccusative() && iobj.node.interp.isGenitive()) {
          return true
        }
      }
    }
  )


  // continuity/projectivity

  for (let token of nodes) {
    if (CONTINUOUS_REL.some(x => uEq(token.node.rel, x))) {
      let rootFromHere = token.root()

      let indexes = mu(walkDepth(token))
        .map(x => node2index.get(x))
        .toArray()
        .sort((a, b) => a - b)
      let holes = findHoles(indexes)
        .filter(i => nodes[i].root() === rootFromHere)

      if (holes.length) {
        if (token.parent.node.interp.isAdverb() && token.node.interp.isInfinitive()) {
          continue
        }
        // console.error(sentence.map(x => x.form).join(' '))
        // console.error(indexes)
        // console.error(holes)
        problems.push({ indexes: holes, message: `чужі токени всередині ${token.node.rel}` })
      }
    } else if (uEq(token.node.rel, 'cc')) {
      // cc тільки з того, в що увіходив conj чи з кореня
    }
  }

  let lastToken = last(nodes)
  // /*/^[\.\?!…]|...$/.test(lastToken.node.form)*/
  if (lastToken.node.interp.isPunctuation()) {
    if (sentenceHasOneRoot) {
      let nonRootParents = lastToken.parents.filter(x => !x.isRoot())
      if (nonRootParents.length
        && nonRootParents.some(x => !x.node.interp.isAbbreviation())
        && !lastToken.node.interp.isQuote()
        && !lastToken.ancestors0().filter(x => !x.isRoot()).some(
          x => uEq(x.node.rel, 'parataxis') || x.node.rel.endsWith(':parataxis'))) {
        problems.push({
          indexes: [nodes.length - 1],
          message: `останній розділовий не з кореня`,
        })
      }
    }
  }

  // modal ADVs, espacially with copula
  // disableable
  let interests = nodes.filter(t =>
    !t.isRoot()
    && uEq(t.node.rel, 'advmod')
    && t.node.interp.isAdverb()
    && isInfinitive(t.parent)
    // && t.parent.isRoot()
    // || !['acl', 'xcomp', 'c'].some(x => uEq(t.parent.node.rel, x)))
    && MODAL_ADVS.some(form => t.node.interp.lemma === form)
  )
  if (0 && interests.length) {
    problems.push({
      indexes: interests.map(x => node2index.get(x)),
      message: `модальний прислівник не підкорінь`,
    })
  }

  // todo
  xtreedReportIf(`залежники голови складеного присудка`,
    t => t.children.some(x => x.node.interp.isInfinitive()
      && uEqSome(x.node.rel, ['xcomp', 'csubj', 'ccomp'])
    )
      && t.children.some(x => uEqSome(x.node.rel, ['obl']))  // туду
  )

  // наістотнення
  // treedReportIf(`obj в родовому`,
  //   (t, i) => uEq(t.node.rel, 'obj')
  //     && t.node.interp.isGenitive()
  //     && !t.children.some(x => isNumgov(x.node.rel))
  //     && !t.parent.node.interp.isNegative()
  //     && !t.parent.children.some(x => uEq(x.node.rel, 'advmod') && x.node.interp.isNegative())
  // )


  // зробити: в AUX не входить cop/aux
  // зробити: остання крапка не з кореня
  // зробити: коми належать підрядним: Подейкують,
  // зробити: conj в "і т. д." йде в "д."
  // зробити: конкеретні дозволені відмінки в :gov-реляціях
  // зробити: mark не з підкореня https://lab.mova.institute/brat/index.xhtml#/ud/prokhasko__opovidannia/047
  // зробити: якщо коренем є NP, і в кінці "!", то корінь і конжі мають бути кличними
  // зробити: More than as a multi-word expression
  // зробити: дробовий числівник nummod:?
  // зробити: наприклад, — чия кома?
  // зробити: кома належить vocative
  // зробити: я не любив праці — родовий якщо з не, інакше перевірити аніміш
  // зробити: на кілька тисяч
  // зробити: nsubj в родовий з не
  // зробити: крапка в паратаксі без закритих дужок/лапок належить паратаксі
  // зробити: незбалансовані дужки/лапки
  // зробити: Ми не в змозі встановити — тест на узгодження підмета з присудком щоб був acl
  // зробити: колишні :марки тільки в рел
  // зробити: крім — не конж
  // зробити: mark лише від голови підрядного
  // зробити: advcl входить в вузол з то
  // зробити: з правого боку прикдаки не виходить зовнішнє
  // зробити: appos’и йдуть пучком, а не як однорідні
  // зробити: узгодження наістотнень!
  // зробити: у нас блаблабла, тому… — блаблабла має бути advcl
  // зробити: obl:agent безособового має бути :anim
  // зробити: знак питання і чи кріпляться до одного
  // зробити: підмети чи присудки не бувають неоднорідні
  // зробити: з того, з чого виходить fixed не може виходити нічого крім fixed
  // зробити: inf-корені/підкорені
  // зробити: вчив вчительку математики
  // зробити: xcomp зі сполучником?
  // зробити: вказівні, з яких не йде щось
  // зробити: питальні без питання
  // зробити: узгодження flat:name
  // зробити: abbr => nv
  // зробити: тоді, коли — щоб advcl йшло з тоді
  // зробити: відносні promoted
  // зробити: опікуватися мамою — мамою тут obj має бути
  // зробити: (упс) advcl з копули а не
  // зробити: advcl замість obl’а
  // зробити: _це_ не при присудку іменн пред




  /*

  Nevertheless, there are four important exceptions to the rule that function words do not take dependents:

  Multiword function words
  Coordinated function words
  Function word modifiers
  Promotion by head elision


  + http://universaldependencies.org/u/overview/syntax.html#function-word-modifiers

  + If the predicative element in the equation is a clause, then the copula
  verb is treated as the head of the clause, with the following clause as a ccomp
   (to prevent that the head of the smaller clause gets two subjects).
   Note that in some languages it may be instead possible to analyze the clause as the subject (csubj), retaining the cop relation for the copula verb.

  */

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
function hasOwnRelative(node: GraphNode<Token>) {
  let it = walkDepth(node, x => x !== node
    && uEqSome(x.node.rel, SUBORDINATE_CLAUSES)
    && !(x.parent.node.interp.isAdverb() && uEqSome(x.node.rel, ['csubj']))
  )

  return mu(it)
    .some(x => x.node.interp.isRelative())
}

//------------------------------------------------------------------------------
function hasChildrenOfUrel(node: GraphNode<Token>, urel: string) {
  return node.children.some(x => uEq(x.node.rel, urel))
}

//------------------------------------------------------------------------------
function thisOrConjHead(node: GraphNode<Token>, predicate: TreedSentencePredicate) {
  if (predicate(node)) {
    return true
  }
  if (!node.isRoot() && uEq(node.parent.node.rel, 'conj') && predicate(node.parent)) {
    return true
  }
  return false
}

//------------------------------------------------------------------------------
function thisOrGovernedCase(node: GraphNode<Token>) {
  let governer = node.children.find(x => isGoverning(x.node.rel))
  if (governer) {
    return governer.node.interp.features.case
  }
  return node.node.interp.features.case
}

//------------------------------------------------------------------------------
function thisOrTravelUp(node: GraphNode<Token>, predicate: TreedSentencePredicate) {
  const allowed = ['conj', 'flat']
  while (node) {
    if (predicate(node)) {
      return true
    }
    node = allowed.some(x => uEq(node.parent.node.rel, x)) && node.parent
  }
  return false
}

//------------------------------------------------------------------------------
function isLocativeWithoutImmediatePrep(node: GraphNode<Token>) {
  return node.node.rel
    && canActAsNounForObj(node)
    && !uEq(node.node.rel, 'det')
    && node.node.interp.isLocative()
    && !node.children.some(x => uEq(x.node.rel, 'case'))
}

//------------------------------------------------------------------------------
function isInfinitive(node: GraphNode<Token>) {
  return node.node.interp.isInfinitive()
    && !node.children.some(x => uEq(x.node.rel, 'aux') && x.node.interp.hasPerson())
}

//------------------------------------------------------------------------------
function isSubordiateRoot(token: Token) {
  return SUBORDINATE_CLAUSES.some(x => uEq(token.rel, x))
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
function isContentWord(token: Token) {
  if (token.isPromoted) {
    return true
  }
  // const CONTENT_WORD_POSES = [Pos.adjective, Pos.adverb, Pos.]
  const FUNCTION_WORD_POSES = [Pos.conjunction, Pos.particle, Pos.punct]
  return !FUNCTION_WORD_POSES.includes(token.interp.features.pos) && !token.interp.isAuxillary()
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
function canBePredicateTreed(node: GraphNode<Token>) {
  let token = node.node
  let interp = token.interp
  return token.isPromoted
    || node.isRoot()
    || uEq(token.rel, 'parataxis')
    || interp.isXForeign()
    || interp.isVerbial()
    || interp.isAdverb()
    || (node.children.some(x => uEq(x.node.rel, 'cop'))
      && (interp.isNounish() || interp.isAdjective())
      && (interp.isNominative() || interp.isInstrumental() || interp.isLocative())
    )
    || ((interp.isNounish() || interp.isAdjective()) && interp.isNominative())
}

//------------------------------------------------------------------------------
function canBePredicate(token: Token, sentence: Token[], index: number) {
  return token.isPromoted
    || !token.hasDeps()
    || uEq(token.rel, 'parataxis')
    || token.interp.isInterjection()
    || token.interp.isVerb()
    || token.interp.isConverb()
    || token.interp.isAdverb()
    || (sentence.some(t => t.headIndex === index && uEq(t.rel, 'cop'))
      && (token.interp.isNounish() || token.interp.isAdjective())
      && (token.interp.isNominative() || token.interp.isInstrumental() || token.interp.isLocative())
    )
    || ((token.interp.isNounish() || token.interp.isAdjective()) && token.interp.isNominative())
    || CLAUSAL_MODIFIERS.includes(token.rel)
}

//------------------------------------------------------------------------------
function canActAsNoun(token: Token) {
  return token.interp.isNounish()
    || token.isPromoted && (token.interp.isAdjectivish() || token.interp.isCardinalNumeral())
    || token.hasTag('graft')
    || token.interp.isXForeign()
    || token.interp.isSymbol()
}

//------------------------------------------------------------------------------
function canActAsNounForObj(node: GraphNode<Token>) {
  return canActAsNoun(node.node)
    || !node.isRoot()
    && node.node.interp.isRelative()
    && thisOrConjHead(node, n => isSubordiateRoot(n.parent.node))
    || node.node.interp.lemma === 'той'
    && node.node.interp.isDemonstrative()
}

//------------------------------------------------------------------------------
// function isNounishEllipticOrMeta(node: GraphNode<Token>) {
//   return isNounishOrElliptic(node.node) || isEncolsedInQuotes(node)
// }

//------------------------------------------------------------------------------
function isActualParticiple(token: Token, sentence: Token[], index: number) {
  return token.interp.isParticiple() && ['obl:agent', /*'advcl', 'obl', 'acl', 'advmod'*/].some(x => sentence.some(xx => xx.headIndex === index && xx.rel === x))
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
