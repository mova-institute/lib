import { Token } from '../token'
import { toUd, UdPos } from './tagset'
import { UdMiRelation } from './syntagset'
import { mu } from '../../mu'
import { GraphNode, walkDepth } from '../../lib/graph'
import { MorphInterp } from '../morph_interp'
import * as f from '../morph_features'
import { last } from '../../lang'
import { uEq, uEqSome } from './utils'
import { MorphAnalyzer } from '../morph_analyzer/morph_analyzer'
import { PREDICATES, isNumericModifier, isGoverning } from './uk_grammar'
import * as g from './uk_grammar'


class SentenceToken extends Token {
  index: number
}

const ALLOWED_RELATIONS: UdMiRelation[] = [
  'parataxis:discourse',
  'parataxis:thatis',
  'advcl:2',
  'xcomp:2',
  'flat:repeat',
  'appos:nonnom',
  'advmod:amtgov',
  'advcl:svc',
  'conj:svc',
  'xcomp:svc',
  'ccomp:svc',
  'compound:svc',

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

const COPULA_LEMMAS = [
  'бути',
  'бувати',
  'бувши',
  'будучи',
]

const CONDITIONAL_AUX_LEMMAS = [
  'б',
  'би',
]

const AUX_LEMMAS = [
  ...COPULA_LEMMAS,
  ...CONDITIONAL_AUX_LEMMAS,
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

const MARK_ROOT_RELS = [
  ...g.SUBORDINATE_CLAUSES,
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




const SIMPLE_RULES: [string, string, SentencePredicate2, string, SentencePredicate2][] = [

  [`det:`,
    `з іменника`,
    (t, s, i) => canActAsNoun(t) || s.some(tt => tt.rel === 'acl' || tt.headIndex === i) || t.hasTag('adjdet'),
    `в нечислівниковий DET`,
    t => toUd(t.interp).pos === 'DET' && !t.interp.isCardinalNumeral() && !t.interp.isOrdinalNumeral()],
  [`amod`, `з іменника`, t => canActAsNoun(t), `в прикметник`, t => t.interp.isAdjectivish()],
  [`nummod`, `з іменника`, t => canActAsNoun(t), `в незайменниковий числівник`, t => t.interp.isCardinalNumeral() && !t.interp.isPronoun()],
  [`det:numgov`, `з іменника`, t => canActAsNoun(t), `в займенниковий числівник`, t => t.interp.isCardinalNumeral() && t.interp.isPronoun()],
  [`discourse`,
    undefined,
    undefined,
    `в ${DISCOURSE_DESTANATIONS.join('|')} чи fixed`,
    (t, s, i) => DISCOURSE_DESTANATIONS.includes(toUd(t.interp).pos) || s[i + 1] && s[i + 1].rel === 'fixed'],
  [`cop`,
    `з недієслівного`,
    (t, s, i) => !t.interp.isVerb() && !t.interp.isConverb() && !isActualParticiple(t, s, i),
    `в ${COPULA_LEMMAS.join(' ')}`,
    t => COPULA_LEMMAS.includes(t.interp.lemma)],
  // [`obl:agent`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменник`, t => canActAsNoun(t)],
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
  [`advcl:`, ``, (t, s, i) => canBePredicate(t, s, i), `в присудок`, (t, s, i) => canBePredicate(t, s, i)],
  [`appos:`, `з іменника`, t => canActAsNoun(t), `в іменник`, t => canActAsNoun(t)],
]

const TREED_SIMPLE_RULES: [string, string, TreedSentencePredicate, string, TreedSentencePredicate][] = [
  // cc не в сурядний is a separate rule

  [`case`,
    `з іменника`,
    t => canActAsNounForObj(t)
      || t.isRoot() //&& todo: more than 1 root
      || t.node.interp.isAdjective() && t.node.interp.isRelative()  // todo: generalize
      || t.node.interp.isCardinalNumeral()  // todo
    // && g.PREPS_HEADABLE_BY_NUMS.includes(
    //   t.children.find(x => x.node.rel === 'case').node.interp.lemma)
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
  [`obj`,
    `з присудка чи валентного прикметника`,
    t => canBePredicateTreed(t) || g.isValencyHavingAdjective(t.node),
    `в іменникове`,
    t => canActAsNounForObj(t)],
  [`iobj`,
    `з присудка чи валентного прикметника`,
    t => canBePredicateTreed(t) || g.isValencyHavingAdjective(t.node),
    `в іменникове`,
    t => canActAsNounForObj(t)],
  [`obl`,
    `з дієслова / прикм. / присл. / іншого obl`,
    t => t.node.interp.isVerbial2()
      || t.node.interp.isAdjective()
      || t.node.interp.isAdverb()
      || (t.node.interp.isNounish() && t.children.some(x => uEqSome(x.node.rel, ['cop'])))
      || t.node.isPromoted
    ,
    `в іменник`,
    t => canActAsNounForObj(t) || t.node.interp.lemma === 'який' && isRelativeInRelcl(t),
  ],
  [`nmod`, `з іменника`, t => canActAsNoun(t.node),
    `в іменник`,
    t => canActAsNounForObj(t) || t.node.interp.lemma === 'який' && isRelativeInRelcl(t)
  ],
  [`aux`,
    `з дієслівного`, t => t.node.interp.isVerbial2()
      || t.node.interp.isAdverb() && t.children.some(x => g.SUBJECTS.some(subj => uEq(x.node.rel, subj))),
    `в ${AUX_LEMMAS.join('|')}`,
    t => AUX_LEMMAS.includes(t.node.interp.lemma)],
  [`acl`, `з іменника`, t => canActAsNoun(t.node) || t.node.interp.isDemonstrative(),
    `в присудок (з умовами)`, t => g.isFeasibleAclRoot(t)
      || t.node.interp.isParticiple()  // temp
  ],
  [`punct`,
    `зі слова`,
    t => !t
      || !t.node.interp.isPunctuation()
      || t.node.hasTag('nestedpunct')
      || g.isPunctInParenthes(t),
    // t => !t /*temp*/ /*|| isContentWord(t)*/ || t.tags.includes('nestedpunct'),
    `в PUNCT`,
    t => t.node.interp.isPunctuation()],
  [`flat:foreign`,
    `з :foreign`, t => t.node.interp.isForeign(),
    `у :foreign`, t => t.node.interp.isForeign()],
  [`xcomp:`,
    `з присудка`,
    t => canBePredicateTreed(t),
    `в інфінітив`,
    t => g.isInfinitive(t) || g.isInfinitiveCop(t)
  ],
  [`xcomp:2`,
    `з присудка`,
    t => canBePredicateTreed(t),
    `в називний/орудний іменник/прикметник`,
    t => (t.node.interp.isNominative() || t.node.interp.isInstrumental())
      && (t.node.interp.isNoun() || t.node.interp.isAdjective())
      && !t.node.isGraft
  ],
  [`advcl:2`,
    `з присудка`,
    t => canBePredicateTreed(t),
    `в називний/орудний іменник/прикметник`,
    t => (t.node.interp.isNominative() || t.node.interp.isInstrumental())
      && (t.node.interp.isNoun() || t.node.interp.isAdjective())
  ]
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
export function validateSentenceSyntax(nodes: GraphNode<Token>[], analyzer: MorphAnalyzer) {

  let problems = new Array<Problem>()

  let sentence = nodes.map(x => x.node)
  let roots = nodes.filter(x => x.isRoot())
  let sentenceHasOneRoot = roots.length === 1
  let node2index = new Map(nodes.map((x, i) => [x, i] as [GraphNode<Token>, number]))

  const oldReportIf = (message: string, fn: SentencePredicate) => {
    problems.push(...mu(sentence).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const reportIf = (message: string, fn: TreedSentencePredicate) => {
    problems.push(...mu(nodes).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const xreportIf = (message: string, fn: TreedSentencePredicate) => undefined
  const xoldReportIf = (message: string, fn: SentencePredicate) => undefined

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
  reportIf(`AUX без cop/aux`, PREDICATES.isAuxWithNoCopAux)

  // simple rules
  for (let [rel, messageFrom, predicateFrom, messageTo, predicateTo] of SIMPLE_RULES) {
    let relMatcher = rel.endsWith(':')
      ? (x: string) => x === rel.slice(0, -1)
      : (x: string) => x === rel || x && x.startsWith(`${rel}:`)

    let relName = rel.endsWith(':') ? `${rel.slice(0, -1)}` : rel

    if (messageFrom && predicateFrom) {
      oldReportIf(`${relName} не ${messageFrom}`,
        (t, i) => relMatcher(t.rel)
          && !sentence[t.headIndex].interp0().isXForeign()
          && !predicateFrom(sentence[t.headIndex], sentence, t.headIndex))
    }

    if (messageTo && predicateTo) {
      oldReportIf(`${relName} не ${messageTo}`,
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
      reportIf(`${relName} не ${messageFrom}`,
        (t, i) => relMatcher(t.node.rel)
          && !predicateFrom(t.parent))
    }
    if (messageTo && predicateTo) {
      reportIf(`${relName} не ${messageTo}`,
        (t, i) => relMatcher(t.node.rel)
          && !predicateTo(t))
    }
  }

  reportIf(`декілька підметів (${g.SUBJECTS.join('|')})`,
    t => t.children.filter(x => uEqSome(x.node.rel, g.SUBJECTS)).length > 1
  )
  reportIf(`декілька прямих додатків`,
    t => t.children.filter(x => uEqSome(x.node.rel, g.CORE_COMPLEMENTS)
      // || uEq(x.node.rel, 'xcomp') && x.node.rel !== 'xcomp:2'
    ).length > 1
  )
  reportIf(`декілька непрямих додатків`,
    t => t.children.filter(x => uEq(x.node.rel, 'iobj')).length > 1
  )
  reportIf(`декілька числівників`,
    t => t.children.filter(x => isNumericModifier(x.node.rel)).length > 1
  )
  reportIf(`декілька gov-реляцій`,
    t => t.children.filter(x => isGoverning(x.node.rel)).length > 1
  )
  reportIf(`декілька cc`,
    t => t.children.filter(x => uEq(x.node.rel, 'cc')).length > 1
  )
  reportIf(`декілька mark’ів`,
    t => t.children.filter(x => uEq(x.node.rel, 'mark')).length > 1
  )
  reportIf(`декілька xcomp’ів`,
    t => t.children.filter(x => uEq(x.node.rel, 'xcomp')
      && x.node.rel !== 'xcomp:2').length > 1
  )
  reportIf(`декілька xcomp:2`,
    t => t.children.filter(x => x.node.rel === 'xcomp:2').length > 1
  )
  reportIf(`декілька cop’ів`,
    t => t.children.filter(x => uEq(x.node.rel, 'cop')).length > 1
  )
  reportIf(`декілька прийменників`,
    t => t.children.filter(x => uEq(x.node.rel, 'case')).length > 1
  )


  oldReportIf(`токен позначено error’ом`, (t, i) => t.hasTag('error'))

  oldReportIf('більше однієї стрілки в слово',
    tok => tok.deps.length > 1 && mu(tok.deps).count(x => x.relation !== 'punct'))

  RIGHT_POINTED_RELATIONS.forEach(rel => oldReportIf(`${rel} ліворуч`, (tok, i) => tok.rel === rel && tok.headIndex > i))
  LEFT_POINTED_RELATIONS.forEach(rel => oldReportIf(`${rel} праворуч`, (tok, i) => tok.rel === rel && tok.headIndex < i))

  oldReportIf(`case праворуч`, (t, i) => uEq(t.rel, 'case')
    && t.headIndex < i
    && !(sentence[i + 1] && sentence[i + 1].interp.isCardinalNumeral())
  )

  oldReportIf('невідома реляція',
    t => t.rel && !ALLOWED_RELATIONS.includes(t.rel as UdMiRelation))

  reportIf(`cc не в сурядний`,
    t => uEq(t.node.rel, 'cc')
      && !t.node.interp.isCoordinating()
      && !g.hasChild(t, 'fixed')
  )

  oldReportIf(`punct в двокрапку зліва`,
    (t, i) => i !== sentence.length - 1  // not last in sentence
      && t.form === ':'
      && t.interp.isPunctuation()
      && t.headIndex < i)

  xoldReportIf(`у залежника ccomp немає підмета`,
    (t, i) => t.rel === 'ccomp'
      && !t.isPromoted
      && !sentence.some(xx => g.SUBJECTS.includes(xx.rel) && xx.headIndex === i))

  reportIf(`у залежника xcomp є підмет`,
    t => uEq(t.node.rel, 'xcomp')
      && !t.node.isGraft
      && t.children.some(x => uEqSome(x.node.rel, g.SUBJECTS))
  )

  oldReportIf('не discourse до частки',
    t => t.rel
      && !['б', 'би', 'не'].includes(t.form.toLowerCase())
      && t.interp.isParticle()
      && !['discourse', 'fixed'])

  xoldReportIf('не aux у б(би)',
    t => CONDITIONAL_AUX_LEMMAS.includes(t.form.toLowerCase())
      && t.interp.isParticle()
      && !['fixed', 'aux', undefined].includes(t.rel))

  oldReportIf('не advmod в не',
    t => t.interp.isParticle()
      && ['не', /*'ні', 'лише'*/].includes(t.form.toLowerCase())
      && !['advmod', undefined].includes(t.rel))

  oldReportIf('не cc в сурядий на початку речення',
    (t, i) => t.rel && i === 0 && t.interp.isCoordinating() && !['cc'].includes(t.rel))

  oldReportIf('obj/iobj має прийменник',
    (t, i) => ['obj', 'iobj'].includes(t.rel) && sentence.some(xx => uEq(xx.rel, 'case') && xx.headIndex === i))

  xoldReportIf(`:pass-реляція?`,
    t => !t.isPromoted
      && ['aux', 'csubj', 'nsubj'].includes(t.rel)
      && sentence[t.headIndex]
      && isPassive(sentence[t.headIndex].interp))  // todo: навпаки

  xoldReportIf(`:obl:agent?`,
    (t, i) => !t.isPromoted
      && t.rel === 'obl'
      && t.interp.isInstrumental()
      && isPassive(sentence[t.headIndex].interp)
      && !hasDependantWhich(i, xx => uEq(xx.rel, 'case')))


  for (let leafrel of LEAF_RELATIONS) {
    reportIf(`${leafrel} має залежників`,
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

  xoldReportIf(`obl з неприсудка`,
    (t, i) => g.OBLIQUES.includes(t.rel)
      && !t.isPromoted
      && !sentence.some(xx => xx.headIndex === i && uEq(xx.rel, 'cop'))
      && !sentence[t.headIndex].interp.isNounish()
      && !sentence[t.headIndex].interp.isVerbial2()
      && !sentence[t.headIndex].interp.isAdjective()
      && !sentence[t.headIndex].interp.isAdverb())

  reportIf(`сполучник виділено розділовим знаком`,
    (t, i) => t.node.interp.isConjunction()
      && t.children.some(ch => ch.node.rel === 'punct')
      && !t.isRoot()
      && !uEq(t.node.rel, 'conj')
      && !t.node.hasTag('commed_conj')
  )

  reportIf(`підмет не в називному`,
    t => uEq(t.node.rel, 'nsubj')
      && !t.node.isGraft
      && g.thisOrGovernedCase(t) !== f.Case.nominative
      && !t.node.interp.isXForeign()
      && !g.isQuantificationalNsubj(t)
      && !g.isQuantitativeAdverbModified(t)
  )

  reportIf(`додаток в називному`,
    t => ['obj', 'iobj', 'obl'].some(x => uEq(t.node.rel, x))
      && g.thisOrGovernedCase(t) === f.Case.nominative
      && !t.node.interp.isXForeign()
      && !t.node.isGraft
      && t.parent.node.interp.isReversive()
      && !(uEq(t.node.rel, 'obl') && g.isTerasaZaTerasoyu(t))
    // && !t.children.some(x => isNumgov(x.node.rel))
    // && !t.children.some(x => x.node.interp.isAdverb())
  )

  // disablable
  xreportIf(`obl без прийменника`,
    t => t.node.rel === 'obl'
      && !t.node.isPromoted
      && !hasChildrenOfUrel(t, 'case')
      && !t.node.interp.isInstrumental()
      && !(
        (t.node.interp.isAccusative() || t.node.interp.isGenitive())
        && g.TEMPORAL_ACCUSATIVES.includes(t.node.interp.lemma)
      )
  )

  xreportIf(`obj/obl в давальний`,
    t => uEqSome(t.node.rel, ['obj', 'obl'])
      && t.node.interp.isDative()
  )

  reportIf(`місцевий без прийменника`,
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

  reportIf(`orphan не з Promoted`,
    t => uEq(t.node.rel, 'orphan')
      && !t.parent.node.isPromoted
  )

  reportIf(`підрядне означальне відкриває що-іменник`,
    t => uEq(t.node.rel, 'acl')
      && t.children.some(x => x.node.form.toLowerCase() === 'що'
        && uEqSome(x.node.rel, ['nsubj'])
      )
  )

  reportIf(`cc без conj`,
    t => uEq(t.node.rel, 'cc')
      && !t.parent.isRoot()
      && !uEq(t.parent.node.rel, 'conj')
      && !t.parent.children.some(x => uEq(x.node.rel, 'conj'))
  )

  // todo
  xreportIf(`підрядне без сполучника`,
    t => uEqSome(t.node.rel, g.SUBORDINATE_CLAUSES)
      && !uEq(t.node.rel, 'xcomp')
      // && !t.parent.children[0].node.interp.isConsequential()
      && !t.children.some(x => uEq(x.node.rel, 'mark'))
      && !g.hasOwnRelative(t)
      // && !t.children.some(x => x.node.interp.isRelative())
      && !g.isInfinitive(t)
      && !(uEq(t.node.rel, 'acl') && t.node.interp.isParticiple())
      && !(uEq(t.node.rel, 'advcl') && t.node.interp.isConverb())
      && !t.node.rel.endsWith(':2')
  )

  xreportIf(`зворотне має obj/iobj`,
    t => !t.isRoot()
      && uEqSome(t.node.rel, ['obj', 'iobj'])
      && t.parent.node.interp.isReversive()
      && !t.node.interp.isDative()
      && !t.node.interp.isGenitive()
      && !t.node.interp.isInstrumental()
  )


  // coordination

  reportIf(`неузгодження відмінків прийменника`,
    (t, i) => uEq(t.node.rel, 'case')
      && (t.node.interp.features.requiredCase as number) !== g.thisOrGovernedCase(t.parent)
      && !t.parent.node.interp.isXForeign()
      && !t.parent.node.isGraft
      && !g.hasChild(t.parent, 'fixed')
  )

  reportIf(`неособове має підмет`,
    t => (t.node.interp.isImpersonal() || g.isInfinitive(t))
      && t.children.some(x => uEqSome(x.node.rel, g.SUBJECTS))
      && !t.node.isPromoted
  )

  reportIf(`вторинна предикація не в називний/орудний прикметник`,
    t => !t.isRoot()
      && t.node.rel.endsWith(':2')
      && !t.node.interp.isAdjective()
      && !t.node.interp.isNominative()
      && !t.node.interp.isInstrumental()
      && !t.node.isGraft
  )

  xreportIf(`знахідний без прийменника від недієслова`,
    t => canActAsNounForObj(t)
      && t.node.interp.isAccusative()
      && !t.isRoot()
      && !t.children.some(x => x.node.interp.isPreposition())
      && !t.parent.node.interp.isVerbial2()
      && !['conj', 'flat'].some(x => uEq(t.node.rel, x))
    // && !thisOrTravelUp(t, tt =>
    //   tt.parent.node.interp.isVerbial()
    //   && tt.children.some(x => x.node.interp.isPreposition())
    // )
    // && !t.parent.node.interp.isVerbial()
  )

  if (roots.length === 1) {
    xreportIf(`інфінітив — корінь`,
      t => t.isRoot()
        && g.isInfinitive(t)
      // && t.children.some(x => uEq(x.node.rel, 'nsubj'))
      // && !t.node.isPromoted
      // && !t.children.some(x => x.node.interp.isAuxillary() && x.node.interp.hasPerson())
    )
  }

  xreportIf(`неузгодження в часі`,
    t => uEq(t.node.rel, 'aux')
      && t.node.interp.isVerb()
      && (t.node.interp.hasFeature(f.Tense) || t.parent.node.interp.hasFeature(f.Tense))
      && !t.parent.node.interp.isInfinitive()
      && t.node.interp.getFeature(f.Tense) !== t.parent.node.interp.getFeature(f.Tense)
      && !t.parent.node.interp.isImpersonal()
  )

  xreportIf(`ні допоміжне, ані повнозначне дієслово не має часу`,
    t => uEq(t.node.rel, 'aux')
      && t.node.interp.isVerb()
      && (t.node.interp.isInfinitive() || !t.node.interp.hasFeature(f.Tense))
      && (t.parent.node.interp.isInfinitive() || !t.parent.node.interp.getFeature(f.Tense))
  )

  reportIf(`неузгодження підмет — прикметник-присудок`,
    t => uEq(t.node.rel, 'nsubj')
      && t.parent.node.interp.isAdjective()
      && !t.parent.node.isPromoted
      && !g.nounAdjectiveAgreed(t, t.parent)
      && !(t.parent.node.interp.isInstrumental() && g.hasCopula(t.parent))
  )

  reportIf(`неузгодження прикладки`,
    t => uEq(t.node.rel, 'appos')
      && t.node.interp.isNounish()
      && t.parent.node.interp.isNounish()
      && !t.node.interp.isXForeign()
      && g.thisOrGovernedCase(t) !== g.thisOrGovernedCase(t.parent)
      // && !g.nounNounAgreed(t.node.interp, t.parent.node.interp)
      // && !t.node.interp.equalsByFeatures(t.parent.node.interp, [f.Case/* , f.MorphNumber */])
      // && ![[t, t.parent], [t.parent, t]].some(([a, b]) =>
      //   g.hasChild(a, 'conj')
      //   && a.node.interp.isSingular()
      //   && b.node.interp.isPlural()
      // )
      && !g.hasChild(t, 'mark')
      && !t.children.some(x => x.node.interp.lemma === '(' && x.node.interp.isPunctuation())
    // && !(t.children.length
    //   && t.children[0].node.interp.lemma === '('
    //   && !t.children[0].node.interp.isPunctuation())
    // (
    // && !t.parent.node.isPromoted
  )

  reportIf(`неузгодження однорідних іменників`,
    t => uEq(t.node.rel, 'conj')
      && !uEqSome(t.parent.node.rel, ['obl'])
      && t.node.interp.isNounish()
      && t.parent.node.interp.isNounish()
      && !t.node.interp.isXForeign()
      && !t.node.interp.equalsByFeatures(t.parent.node.interp, [f.Case/* , f.MorphNumber */])
      && g.thisOrGovernedCase(t) !== g.thisOrGovernedCase(t.parent)
      && !g.isQuantitativeAdverbModified(t)
      // && !g.isQuantitativeAdverbModified(t.parent)
      && !(uEqSome(t.parent.node.rel, ['nmod'])
        && g.hasChild(t, 'case'))
  )

  reportIf(`неузгодження однорідних прикметників`,
    t => uEq(t.node.rel, 'conj')
      // && !uEqSome(t.parent.node.rel, ['obl'])
      && t.node.interp.isAdjective()
      && t.parent.node.interp.isAdjective()
      && !t.parent.node.interp.equalsByFeatures(t.node.interp, [f.Case/* , f.MorphNumber */])
      && !t.node.isPromoted
  )

  xreportIf(`неузгодження однорідних дієслів`,
    t => uEq(t.node.rel, 'conj')
      && t.node.rel !== 'conj:parataxis'
      // && !uEqSome(t.parent.node.rel, ['obl'])
      && t.node.interp.isVerbial()
      && t.parent.node.interp.isVerbial()
      && !t.parent.node.interp.equalsByFeatures(t.node.interp, [
        f.Tense, f.Person, f.MorphNumber])
      && !g.hasChild(t, 'nsubj')
  )


  reportIf(`неузгодження підмет-присудок`,
    (t, i) => {
      if (t.isRoot()
        || t.node.hasTag('graft')
        || !uEq(t.node.rel, 'nsubj')
        || !t.parent.node.interp.isVerbial2()
        || t.parent.node.interp.isImpersonal()
        || t.node.interp.isXForeign()
      ) {
        return false
      }

      let interp = t.node.interp
      let subjFeats = t.node.interp.features

      let verbInterp = t.parent.node.interp
      if (verbInterp.isInfinitive()) {
        let aux = t.parent.children.find(x => uEqSome(x.node.rel, ['aux']))
        if (aux) {
          verbInterp = aux.node.interp
        } else {

        }
      }

      if (verbInterp.hasPerson()
        // todo: losen
        && !(interp.isPronoun() && !interp.isPersonal() && !interp.hasFeature(f.Person))
      ) {
        let subjPerson = subjFeats.person || f.Person.third
        if (subjPerson !== verbInterp.features.person) {
          return true
        }
      }

      if (verbInterp.hasGender()
        && !(interp.isForeign() && !interp.hasGender())
        && !t.node.hasTag('gendisagr')
        && !interp.isPlural()
        // && !(t.node.interp.isPronoun()
        //   && subjFeats.person === Person.first || subjFeats.person === Person.second)
        && !(interp.isPronoun() && g.GENDERLESS_PRONOUNS.includes(interp.lemma))
        && verbInterp.getFeature(f.Gender) !== interp.getFeature(f.Gender)
        && !g.isNegativeExistentialPseudosubject(t)
        && (!interp.isNoun() && interp.lemma === 'це')
      ) {
        // return true
      }

      if (!t.children.some(x => uEq(x.node.rel, 'conj'))
        && !g.hasNmodConj(t)
        && !t.node.hasTag('numdisagr')
        && !(t.node.interp.isPronoun() && !t.node.interp.hasNumber())
        && verbInterp.getFeature(f.MorphNumber) !== interp.getFeature(f.MorphNumber)
        && !(g.isNumeralModified(t)/*  && interp.isGenitive() */)
        && !verbInterp.isInstant()
      ) {
        return true
      }
    }
  )

  reportIf(`неузгодження іменник-прикметник`,
    (t, i) => {
      if (t.isRoot()) {
        return
      }
      let interp = t.node.interp
      let nounInterp = t.parent.node.interp

      let ret = uEqSome(t.node.rel, ['amod', 'det'])
        || uEqSome(t.node.rel, ['acl']) && nounInterp.isParticiple()
      ret = ret
        && interp.isAdjective()
        && !t.parent.node.isGraft
        && !nounInterp.isXForeign()
        && (
          (interp.hasGender()
            && interp.features.gender !== nounInterp.features.gender
            && !t.parent.node.isPromoted
            && !g.GENDERLESS_PRONOUNS.includes(nounInterp.lemma)
            && !(interp.isOrdinalNumeral() && nounInterp.lemma === 'рр.')
          )
          || (interp.features.case !== nounInterp.features.case
            && interp.features.case !== g.thisOrGovernedCase(t.parent)
          )
        )

      return ret
    }
  )

  xreportIf(`неузгодження`,
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
          dep.features.case !== g.thisOrGovernedCase(t.parent)
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

  reportIf(`неузгодження істотовості`,
    t => uEqSome(t.node.rel, ['amod', 'det', 'nummod'])
      && t.node.interp.hasFeature(f.RequiredAnimacy)
      && t.parent.node.interp.hasFeature(f.Animacy)
      && t.node.interp.features.requiredAnimacy as number !== t.parent.node.interp.features.animacy
      && t.node.interp.features.requiredAnimacy as number !== t.parent.node.interp.features.grammaticalAnimacy
    // todo: or ranim for promoted adj
  )

  reportIf(`неузгодження flat:name`,
    t => t.node.rel === 'flat:name'
      && !g.nounNounAgreed(t.parent.node.interp, t.node.interp)
  )

  xreportIf(`неузгодження flat:title`,
    t => t.node.rel === 'flat:title'
      && !g.nounNounAgreed(t.parent.node.interp, t.node.interp)
  )

  xreportIf(`неузгодження однорідних`,
    t => {
      if (!uEq(t.node.rel, 'conj')
        || t.node.rel === 'conj:parataxis'
      ) {
        return
      }

      if (t.node.interp.isNounish()
        && !t.parent.node.interp.equalsByFeatures(t.node.interp, [f.Case])
      ) {
        // return true
      }

      if (t.node.interp.isVerb()
        && !t.parent.node.interp.equalsByFeatures(t.node.interp, [f.VerbAuxilarity,
        f.VerbType, f.Gender])
      ) {
        // return true
      }

      if (t.node.interp.isAdjective()
        && !t.parent.node.interp.equalsByFeatures(t.node.interp, [
          f.Case, f.Gender])
      ) {
        return true
      }
    }
  )

  reportIf(`gov-реляція між однаковими відмінками`,
    t => isGoverning(t.node.rel)
      && t.node.interp.features.case === t.parent.node.interp.features.case
  )

  reportIf(`не gov-реляція між різними відмінками`,
    t => !isGoverning(t.node.rel)
      && ['nummod', 'det:nummod'].some(rel => uEq(t.node.rel, rel))
      && !t.parent.node.interp.isXForeign()
      && t.node.interp.features.case !== t.parent.node.interp.features.case
  )

  reportIf(`керівний числівник не в називному/знахідному`,
    t => isGoverning(t.node.rel)
      && t.node.interp.features.case !== t.parent.node.interp.features.case
      && ![f.Case.nominative, f.Case.accusative].includes(t.node.interp.features.case)
  )

  reportIf(`множинний числівник керує одниною`,
    t => uEqSome(t.node.rel, ['nummod', 'det:nummod', 'det:numgov'])
      && !t.parent.node.interp.isPlural()
      && !t.node.interp.lemma.endsWith('1')
      && !['один', 'півтора'].includes(t.node.interp.lemma)
      && !g.canBeDecimalFraction(t)
      && !t.parent.node.interp.isXForeign()
  )

  reportIf(`кероване числівником не в родовому`,
    t => {
      let governer = t.children.find(x => isGoverning(x.node.rel))
      if (!governer) {
        return
      }

      return t.node.interp.features.case !== governer.node.interp.features.case
        && !t.node.interp.isGenitive()
    }
  )

  reportIf(`mark не з кореня підрядного`,
    (t, i) => uEq(t.node.rel, 'mark')
      // && !t.parent.isRoot()
      && (sentenceHasOneRoot && !t.parent.node.rel
        || t.parent.node.rel
        && !uEqSome(t.parent.node.rel, MARK_ROOT_RELS)
        && !(uEq(t.parent.node.rel, 'conj')
          && g.SUBORDINATE_CLAUSES.some(x => uEq(t.parent.parent.node.rel, x))
        )
      )
      && !(i === 0 && t.parent.isRoot())
  )

  reportIf(`parataxis під’єднано сполучником`,
    t => uEq(t.node.rel, 'parataxis')
      && t.node.rel !== 'parataxis:discourse'
      && t.children.some(x => uEqSome(x.node.rel, ['cc', 'mark']))
  )

  reportIf(`xcomp зі сполучником`,
    t => uEq(t.node.rel, 'xcomp')
      // && t.node.rel !== 'parataxis:discourse'
      && t.children.some(x => uEqSome(x.node.rel, ['cc', 'mark']))
  )

  reportIf(`flat:name не для імені`,
    t => (t.node.rel === 'flat:name' || t.children.some(x => x.node.rel === 'flat:name'))
      && !t.node.interp.isName()
  )

  // todo
  xreportIf(`речення з _то_ підряне`,
    t => uEqSome(t.node.rel, g.SUBORDINATE_CLAUSES)
      && t.children.some(x => x.node.interp.lemma === 'то')
  )

  reportIf(`заперечення під’єднане не до cop/aux`,
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

  reportIf(`parataxis:discourse в одне слово-недієслово`,
    t => t.node.rel === 'parataxis:discourse'
      && !t.children.length
      && !t.node.interp.isVerb()
  )

  xreportIf(`discourse у фразу`,
    t => uEq(t.node.rel, 'discourse')
      && t.children.filter(x => !uEqSome(x.node.rel, ['fixed', 'punct'])).length
  )

  reportIf(`кількісний прислівник модифікує множину`,
    t => t.node.rel === 'advmod:amtgov'
      && t.parent.node.interp.isPlural()
      && !t.parent.node.interp.isNoSingular()
      && !t.parent.node.interp.hasNonpositiveDegree()
      && !['чимало', 'трохи'].includes(t.node.interp.lemma)
  )

  xreportIf(`кого.Acc чому.Gen: patient не iobj?`,
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
    if (uEqSome(token.node.rel, CONTINUOUS_REL)) {
      let rootFromHere = token.root()

      let indexes = mu(walkDepth(token))
        .map(x => node2index.get(x))
        .toArray()
        .sort((a, b) => a - b)

      let holes = findHoles(indexes)
        .filter(i => nodes[i].root() === rootFromHere)
        .map(x => nodes[x])
        .filter(x => !mu(x.walkThisAndUp0()).some(xx => xx.node.hasTag('legal_alien')))
        .map(x => node2index.get(x))

      if (holes.length) {
        if (token.parent.node.interp.isAdverb() && token.node.interp.isInfinitive()) {
          continue
        }
        // console.error(sentence.map(x => x.form).join(' '))
        // console.error(indexes)
        // console.error(holes)
        problems.push({ indexes: [...holes], message: `чужі токени всередині ${token.node.rel}` })
      }
    }
  }

  let lastToken = last(nodes)
  if (lastToken.node.rel
    && !/[!?]|...|…/.test(lastToken.node.form)  // todo: add stricter condition
    && lastToken.node.interp.isPunctuation()
    && !lastToken.parents.some(x => x.isRoot())
    && !lastToken.parents.some(x => x.node.interp.isAbbreviation()
      || uEq(x.node.rel, 'parataxis')
      || x.node.rel.endsWith(':parataxis')
    )
    && !lastToken.node.interp.isQuote()
    && !(lastToken.node.interp.isForeign() && lastToken.parent.node.form.length === 1)
    && !lastToken.parent.node.isGraft
  ) {
    problems.push({
      indexes: [nodes.length - 1],
      message: `останній розділовий не з кореня`,
    })
  }

  // modal ADVs, espacially with copula
  // disableable
  let interests = nodes.filter(t =>
    !t.isRoot()
    && uEq(t.node.rel, 'advmod')
    && t.node.interp.isAdverb()
    && g.isInfinitive(t.parent)
    // && t.parent.isRoot()
    // || !['acl', 'xcomp', 'c'].some(x => uEq(t.parent.node.rel, x)))
    && g.SOME_MODAL_ADVS.some(form => t.node.interp.lemma === form)
  )
  if (0 && interests.length) {
    problems.push({
      indexes: interests.map(x => node2index.get(x)),
      message: `модальний прислівник не підкорінь`,
    })
  }

  // todo
  xreportIf(`залежники голови складеного присудка`,
    t => t.children.some(x => x.node.interp.isInfinitive()
      && uEqSome(x.node.rel, ['xcomp', 'csubj', 'ccomp'])
    )
      && t.children.some(x => uEqSome(x.node.rel, ['obl']))  // туду
  )

  reportIf(`cop без підмета`,
    t => uEq(t.node.rel, 'cop')
      && !t.parent.children.some(x => uEqSome(x.node.rel, g.SUBJECTS))
      && !t.parent.node.interp.isAdverb()
      && !t.parent.node.interp.isAdjective()
      && !t.parent.node.interp.isInstrumental()
      && !uEq(t.parent.node.rel, 'xcomp')
  )

  reportIf(`conj без розділового чи сполучника`,
    t => g.isConjWithoutCcOrPunct(t)
      && t.node.rel !== 'conj:svc'
  )

  reportIf(`conj без розділового чи сполучника (може conj:svc?)`,
    t => g.isConjWithoutCcOrPunct(t)
      && t.node.rel !== 'conj:svc'
      && [f.VerbType.indicative, f.VerbType.infinitive, f.VerbType.imperative]
        .includes(t.node.interp.getFeature(f.VerbType))
  )

  reportIf(`advcl без сполучування (може advcl:svc?)`,
    t => uEq(t.node.rel, 'advcl')
      && t.node.rel !== 'advcl:2'
      && t.node.rel !== 'advcl:svc'
      && [f.VerbType.indicative, f.VerbType.infinitive, f.VerbType.imperative, f.VerbType]
        .includes(t.node.interp.getFeature(f.VerbType))
      && !t.children.some(x => uEqSome(x.node.rel, ['mark'])
        || x.node.interp.isRelative()
        || x.node.interp.isPreposition()  // замість просто зробити
      )
  )

  xreportIf(`ccomp:svc-test`,
    t => t.node.rel === 'ccomp'
      && [f.VerbType.indicative, f.VerbType.infinitive, f.VerbType.imperative]
        .includes(t.node.interp.getFeature(f.VerbType))
      && !t.children.some(x => uEqSome(x.node.rel, ['mark'])
        || x.node.interp.isRelative()
        || x.node.interp.isPreposition()  // замість просто зробити
      )
  )

  xreportIf(`xcomp:svc-test`,
    t => t.node.rel === 'xcomp'
      && !t.parent.node.interp.isReversive()
      && [f.VerbType.indicative, f.VerbType.infinitive, f.VerbType.imperative]
        .includes(t.node.interp.getFeature(f.VerbType))
      && !t.children.some(x => uEqSome(x.node.rel, ['mark'])
        || x.node.interp.isRelative()
        || x.node.interp.isPreposition()  // замість просто зробити
      )
      && !g.SOME_FREQUENT_TRANSITIVE_VERBS.includes(t.parent.node.interp.lemma)
      && !t.parent.node.interp.isAdjective()
  )

  reportIf(`compound:svc неочікуваний`,
    t => t.node.rel === 'compound:svc'
      && !g.isCompounSvcCandidate(t)
  )

  reportIf(`кандидат на compound:svc`,
    t => g.isCompounSvcCandidate(t)
      && t.node.rel !== 'compound:svc'
  )

  reportIf(`не csubj з модального прислівника `,
    t => !t.isRoot()
      && t.parent.node.interp.isAdverb()
      && t.node.interp.isInfinitive()
      && !uEqSome(t.node.rel, ['csubj', 'conj'])
      && !t.children.some(x => uEqSome(x.node.rel, ['mark']))
  )

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  reportIf(`неочікувана реляція в прийменник`,
    t => t.node.rel
      && t.node.interp.isPreposition()
      && !uEqSome(t.node.rel, ['case', 'conj', 'fixed'])
      && !t.children.some(x => uEqSome(x.node.rel, ['fixed']))
  )

  reportIf(`неочікувана реляція в частку`,
    t => t.node.rel
      && t.node.interp.isParticle()
      && !uEqSome(t.node.rel, ['discourse', 'advmod', 'fixed', 'flat:repeat', 'goeswith'])
      && !(uEqSome(t.node.rel, ['aux']) && CONDITIONAL_AUX_LEMMAS.includes(t.node.interp.lemma))
    // && !t.children.some(x => uEqSome(x.node.rel, ['fixed']))
  )

  reportIf(`неочікувана реляція в вигук`,
    t => t.node.rel
      && !t.node.isGraft
      && t.node.interp.isInterjection()
      && !uEqSome(t.node.rel, ['discourse', 'flat:repeat'])
  )

  xreportIf(`неочікувана реляція в символ`,
    t => t.node.rel
      && t.node.interp.isSymbol()
      && !uEqSome(t.node.rel, ['discourse'])
  )

  reportIf(`неочікувана реляція в :beforeadj`,
    t => t.node.rel
      && t.node.interp.isBeforeadj()
      && (t.node.rel !== 'compound'
        || t.parent.node.indexInSentence < t.node.indexInSentence)
  )

  reportIf(`:beforeadj не має дефіса-залежника`,
    t => t.node.interp.isBeforeadj()
      && !t.isRoot()
      && !t.children.some(x => /^[−\-\–\—]$/.test(x.node.interp.lemma)
        && x.node.indexInSentence > t.node.indexInSentence
      )
  )

  reportIf(`неочікувана реляція в PUNCT`,
    t => t.node.rel
      && t.node.interp.isPunctuation()
      && !uEqSome(t.node.rel, ['punct'])
  )

  reportIf(`неочікувана реляція в дієприслівник`,
    t => t.node.rel
      && t.node.interp.isConverb()
      && !uEqSome(t.node.rel, ['advcl', 'conj', 'parataxis:discourse'])
      && !g.isAdverbialAcl(t)
  )

  reportIf(`неочікувана реляція в AUX`,
    t => t.node.rel
      && t.node.interp.isAuxillary()
      && !uEqSome(t.node.rel, ['aux', 'cop'])
    // && !(uEq(t.node.rel, 'aux') && CONDITIONSL_BY_LEMMAS.includes(t.node.interp.lemma))
    // && !t.children.some(x => uEqSome(x.node.rel, ['fixed']))
  )

  reportIf(`неочікувана реляція в сурядний`,
    t => t.node.rel
      && t.node.interp.isCoordinating()
      && !uEqSome(t.node.rel, ['cc'])
  )

  reportIf(`неочікувана реляція в SCONJ`,
    t => t.node.rel
      && t.node.interp.isSubordinative()
      && !uEqSome(t.node.rel, ['mark'])
  )

  xreportIf(`неочікувана реляція в іменник`,
    t => t.node.rel
      && t.node.interp.isNoun()
      && !uEqSome(t.node.rel, ['nsubj', 'nmod', 'appos', 'conj', 'obj', 'iobj', 'obl',
        'flat:title', 'flat:name', 'xcomp:2', 'flat:repeat', 'parataxis:discourse'])
      && !(uEqSome(t.node.rel, ['advcl']) && t.children.some(x => uEqSome(x.node.rel, ['mark'])))
      && !uEqSome(t.node.rel, [...CLAUSAL_MODIFIERS])  // todo
  )

  xreportIf(`неочікувана реляція в дієслово`,
    t => t.node.rel
      && !t.node.isGraft
      && t.node.interp.isVerb()
      && !t.node.interp.isAuxillary()
      && !uEqSome(t.node.rel, [...CLAUSAL_MODIFIERS, 'parataxis', 'conj', 'flat:repeat',
        'parataxis:discourse'])
  )

  reportIf(`неочікувана реляція в DET`,
    t => t.node.rel
      && !t.node.isPromoted
      && toUd(t.node.interp).pos === 'DET'  // todo: .isDet()
      && !uEqSome(t.node.rel, ['det', 'conj', 'fixed', 'advcl:2'])
      && !isRelativeInRelcl(t)
  )

  xreportIf(`неочікувана реляція в числівник`,
    t => t.node.rel
      && t.node.interp.isCardinalNumeral()
      && !t.node.isPromoted
      && !uEqSome(t.node.rel, ['nummod', 'conj', 'flat:title'])
      && !(toUd(t.node.interp).pos === 'DET'
        && uEqSome(t.node.rel, ['det:nummod', 'det:numgov', 'conj']))
  )

  reportIf(`неочікувана реляція в кличний іменник`,
    t => t.node.rel
      && t.node.interp.isVocative()
      && t.node.interp.isNounish()
      && !uEqSome(t.node.rel, ['vocative', 'flat:name', 'conj', 'flat:title',
        'flat:repeat', 'parataxis'])
  )

  reportIf(`неочікувана реляція в називний іменник`,
    t => t.node.rel
      && t.node.interp.isNominative()
      && t.node.interp.isNounish()
      && uEqSome(t.node.rel, ['nmod'])
    // && !uEqSome(t.node.rel, ['nsubj', 'flat:title', 'flat:name',
    //   'flat:repeat', 'parataxis', 'conj', 'appos', 'expl',
    // ])
    // todo
  )

  reportIf(`неочікувана реляція в :stem`,
    t => t.node.rel
      && t.node.interp.isStem()
      && !uEqSome(t.node.rel, ['compound'])
  )

  reportIf(`неочікувана реляція в прислівник з іменника`,
    t => !t.isRoot()
      && t.node.interp.isAdverb()
      && t.parent.node.interp.isNounish()
      && !uEqSome(t.node.rel, ['discourse', 'parataxis'])
      && !uEqSome(t.parent.node.rel, ['obl'])
      && !t.parent.children.some(x => uEqSome(x.node.rel, ['nsubj', 'cop']))
      && !t.node.interp.isNegative()
      && !g.isQuantitativeAdverbModifier(t)
      && !t.parent.node.isPromoted
      && !g.isModalAdv(t)
      && !g.ADVERBS_MODIFYING_NOUNS.includes(t.node.interp.lemma)
  )

  xreportIf(`неочікувана реляція в прислівник`,
    t => t.node.rel
      && t.node.interp.isAdverb()
      && !t.parent.node.interp.isNounish()
      && !uEqSome(t.node.rel, ['advmod', 'discourse', 'conj', 'fixed'])
      && !g.isModalAdv(t)
  )

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  xreportIf(`означення при займеннику`,
    t => uEqSome(t.node.rel, ['amod', 'det'])
      && t.parent.node.interp.isNoun()
      && t.parent.node.interp.isPronoun()
      && !t.parent.node.interp.isIndefinite()
      && !t.parent.node.interp.isGeneral()
  )

  reportIf(`неочікуваний відмінок obj`,
    t => uEqSome(t.node.rel, ['obj'])
      && !t.node.isGraft
      && !(t.node.interp.isForeign() && !t.node.interp.hasCase())
      && g.thisOrGovernedCase(t) !== f.Case.accusative
      && g.thisOrGovernedCase(t) !== f.Case.genitive
      && !(g.thisOrGovernedCase(t) === f.Case.instrumental
        && g.WORDS_WITH_INS_VALENCY.includes(t.parent.node.interp.lemma))
      && !(t.node.interp.isDative()
        && !t.parent.children.some(x => uEq(x.node.rel, 'iobj')))
      && !t.parent.node.interp.isReversive()  // todo
  )

  reportIf(`неочікуваний відмінок iobj`,
    t => uEqSome(t.node.rel, ['iobj'])
      && !t.node.isGraft
      && g.thisOrGovernedCase(t) !== f.Case.dative
      && !(t.node.interp.isForeign() && !t.node.interp.hasCase())
      && !(t.parent.children.some(x => uEq(x.node.rel, 'obj')
        && g.thisOrGovernedCase(x) === f.Case.genitive))
  )

  reportIf(`неочікуваний відмінок obl`,
    t => uEqSome(t.node.rel, ['obl'])
      && !t.node.isGraft
      && !(t.node.interp.isForeign() && !t.node.interp.hasCase())
      && (g.thisOrGovernedCase(t) === f.Case.nominative
        || g.thisOrGovernedCase(t) === f.Case.vocative
      )
      && !g.isTerasaZaTerasoyu(t)
  )

  reportIf(`nummod праворуч`,
    t => isNumericModifier(t.node.rel)
      && node2index.get(t) > node2index.get(t.parent)
      && !(t.parent.node.interp.isGenitive()
        && t.parent.node.interp.isPlural()
        && t.node.interp.isAccusative()
      )
      && !g.CURRENCY_SYMBOLS.includes(t.parent.node.interp.lemma)
  )

  xreportIf(`підрядне наслідку — головне`,
    t => uEqSome(t.node.rel, ['advcl'])
      // todo: generalize
      && t.children.some(x => x.node.interp.lemma === 'тому'
        && x.node.interp.isDemonstrative())
  )

  reportIf(`порядковий праворуч`,
    t => /^\d+$/.test(t.node.form)
      && uEqSome(t.node.rel, ['amod'])
      && t.node.interp.isOrdinalNumeral()
      && t.node.indexInSentence > t.parent.node.indexInSentence
  )

  reportIf(`неочікуваний відмінок nmod`,
    t => uEqSome(t.node.rel, ['nmod'])
      && t.node.interp.isAccusative()
      && !g.hasChild(t, 'case')
      && !t.children.some(x => x.node.interp.lemma === '/'
        && x.node.indexInSentence < t.node.indexInSentence)
      && !(t.parent.node.interp.isParticiple()
        && t.parent.node.interp.isActive())
  )

  reportIf(`неочікуваний відмінок прикметника-присудка`,
    t => g.hasChild(t, 'nsubj')
      && t.node.interp.isAdjective()
      && !t.node.isPromoted
      && !t.node.interp.isNominative()
      && !(t.node.interp.isInstrumental() && g.hasCopula(t))
  )

  reportIf(`родовий прямий додаток без заперечення`,
    t => uEqSome(t.node.rel, ['obj'])
      && t.parent.node.interp.isVerbial()
      && g.thisOrGovernedCase(t) === f.Case.genitive
      && !g.isNegated(t.parent)
      && !t.parent.node.interp.isReversive()
      && !g.isQuantitativeAdverbModified(t)
      && !(t.parent.parent
        && t.node.interp.isInfinitive()
        && t.parent.parent.children.some(x => x.node.interp.isNegative())
      )
      // && t.parent.node.interp.lemma !== 'немати'
      && (t.node.interp.isAnimate()
        || analyzer.tag(t.node.form).some(x => x.isAccusative()
          && x.equalsByLemmaAndFeatures(t.node.interp, [f.Case, f.Gender, f.Animacy])
        )
      )
  )

  xreportIf(`вказують як синонім`,
    t => (t.node.interp.isNounish() || t.node.interp.isAdjective())
      && (t.node.interp.isNominative() || t.node.interp.isAccusative())
      && t.children.some(x => x.node.interp.lemma === 'як')
  )

  xreportIf(`amod в вираз`,
    t => uEq(t.node.rel, 'amod')
      && g.isFeasibleAclRoot(t)
      && t.node.interp.isParticiple()
  )

  reportIf(`„більш ніж“ не fixed`,
    t => ['ніж', 'як', 'від', 'чим'].includes(t.node.form)
      && sentence[t.node.indexInSentence - 1]
      && ['більше', 'більш'].includes(sentence[t.node.indexInSentence - 1].form)
      && !uEq(t.node.rel, 'fixed')
  )


  // наістотнення
  // treedReportIf(`obj в родовому`,
  //   (t, i) => uEq(t.node.rel, 'obj')
  //     && t.node.interp.isGenitive()
  //     && !t.children.some(x => isNumgov(x.node.rel))
  //     && !t.parent.node.interp.isNegative()
  //     && !t.parent.children.some(x => uEq(x.node.rel, 'advmod') && x.node.interp.isNegative())
  // )


  // в AUX не входить cop/aux
  // остання крапка не з кореня
  // коми належать підрядним: Подейкують,
  // conj в "і т. д." йде в "д."
  // конкеретні дозволені відмінки в :gov-реляціях
  // mark не з підкореня https://lab.mova.institute/brat/index.xhtml#/ud/prokhasko__opovidannia/047
  // якщо коренем є NP, і в кінці "!", то корінь і конжі мають бути кличними
  // More than as a multi-word expression
  // дробовий числівник nummod:?
  // наприклад, — чия кома?
  // кома належить vocative
  // я не любив праці — родовий якщо з не, інакше перевірити аніміш
  // на кілька тисяч
  // nsubj в родовий з не
  // крапка в паратаксі без закритих дужок/лапок належить паратаксі
  // незбалансовані дужки/лапки
  // Ми не в змозі встановити — тест на узгодження підмета з присудком щоб був acl
  // колишні :марки тільки в рел
  // крім — не конж
  // mark лише від голови підрядного
  // advcl входить в вузол з то
  // з правого боку прикдаки не виходить зовнішнє
  // appos’и йдуть пучком, а не як однорідні
  // у нас блаблабла, тому… — блаблабла має бути advcl
  // obl:agent безособового має бути :anim
  // знак питання і чи кріпляться до одного
  // підмети чи присудки не бувають неоднорідні
  // ? з того, з чого виходить fixed не може виходити нічого крім fixed
  // inf-корені/підкорені
  // вчив вчительку математики
  // xcomp зі сполучником?
  // вказівні, з яких не йде щось
  // питальні без питання
  // abbr => nv
  // тоді, коли — щоб advcl йшло з тоді
  // відносні promoted
  // опікуватися мамою — мамою тут obj має бути
  // (упс) advcl з копули а не
  // advcl замість obl’а
  // _це_ не при присудку іменн пред
  // після числівників, що дають неістотам родовий — в істот теж має бути родовий
  // використовувати ліс як декорації — ліс і декорації узгод у відм.
  // cop в дієприсл?
  // звик опікуватися мамою сам
  // xcomp:2
  // не flat:title в №
  // нам вдалося Inf — csubj vs ccomp
  // не оповідатиму, що сталося — тут навпаки що що — іменник
  // більш практичний, ніж політичний — advcl з практичний!
  // по батькові не йде перед іменем тощо
  // не ліквідували тут татарського етнічного нашарування — не забороняє v_zna:animish
  // глобальний конж
  // шасі, що прибиралось — узгодження навіть з таким аклом
  // стінки не проб’єш і їжака голіруч не візьмеш — от де родовий і не аніміш
  // узгодж Добре видно арматуру, характерні лишайники, що живуть тільки на бетоні.
  // наприклад — discourse
  // так захопився, що — з вказівних advcl а не з кореня (що робити з порівняннями?)
  // Крім світлин , я крав рогалики — заборонити advcl(, світлин)
  // conj:parataxis не коли однорідні підрядні
  // ціль завбільшки з табуретку — consistent acl
  // рослина висотою сантиметр — flat:title
  // вказують як синонім — xcomp:2
  // кома-риска з-від праворуч
  // між двома inf коли друге без спол не підр зв
  // тобто, цебто, а саме, як-от, або, чи (у значенні “тобто”)
  // десяткові дроби однина




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
      t =>
    )

  */


  return problems
}

//------------------------------------------------------------------------------
function isRelativeInRelcl(node: GraphNode<Token>) {
  if (!node.node.interp.isRelative()) {
    return false
  }
  let clauseRoot = mu(node.walkUp0())
    .find(x => uEqSome(x.node.rel, CLAUSE_RELS))

  return clauseRoot && uEq(clauseRoot.node.rel, 'acl')
}

//------------------------------------------------------------------------------
function descendantIndexes(node: GraphNode<Token>) {
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
function isLocativeWithoutImmediatePrep(t: GraphNode<Token>) {
  return t.node.rel
    && canActAsNounForObj(t)
    && !uEq(t.node.rel, 'det')
    && t.node.interp.isLocative()
    && !t.children.some(x => uEq(x.node.rel, 'case'))
}

//------------------------------------------------------------------------------
function isSubordiateRoot(token: Token) {
  return g.SUBORDINATE_CLAUSES.some(x => uEq(token.rel, x))
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
  const FUNCTION_WORD_POSES = [f.Pos.conjunction, f.Pos.particle, f.Pos.punct]
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
    || interp.isVerbial2()
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
