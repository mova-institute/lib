import { Token } from '../token'
import { toUd } from './tagset'
import { UdMiRelation } from './syntagset'
import { mu } from '../../mu'
import { GraphNode, walkDepth } from '../../lib/graph'
import { MorphInterp } from '../morph_interp'
import * as f from '../morph_features'
import { last } from '../../lang'
import { uEq, uEqSome } from './utils'
import { startsWithCapital } from '../../string_utils'
import { MorphAnalyzer } from '../morph_analyzer/morph_analyzer'
import { PREDICATES, isNumericModifier, isGoverning } from './uk_grammar'
import * as g from './uk_grammar'
import * as _ from 'lodash'



const SIMPLE_RULES: [string, string, SentencePredicate2, string, SentencePredicate2][] = [
  [`amod`, `з іменника`, t => canActAsNoun(t), `в прикметник`, t => t.interp.isAdjective()],
  [`nummod`, `з іменника`, t => canActAsNoun(t), `в незайменниковий числівник`, t => t.interp.isCardinalNumeral() && !t.interp.isPronominal()],
  [`det:numgov`, `з іменника`, t => canActAsNoun(t), `в займенниковий числівник`, t => t.interp.isCardinalNumeral() && t.interp.isPronominal()],
  [`discourse`,
    undefined,
    undefined,
    `в ${g.DISCOURSE_DESTANATIONS.join('|')} чи fixed`,
    (t, s, i) => g.DISCOURSE_DESTANATIONS.includes(toUd(t.interp).pos) || s[i + 1] && s[i + 1].rel === 'fixed'],
  [`cop`,
    `з недієслівного`,
    (t, s, i) => !t.interp.isVerb() && !t.interp.isConverb() && !isActualParticiple(t, s, i),
    `в ${g.COPULA_LEMMAS.join(' ')}`,
    t => g.COPULA_LEMMAS.includes(t.interp.lemma)],
  // [`obl:agent`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменник`, t => canActAsNoun(t)],
  [`vocative`,
    undefined, //`з присудка`,
    (t, s, i) => canBePredicateOld(t, s, i),
    `в кличний іменник`,
    t => t.interp.isXForeign()
      || canActAsNoun(t) && (t.interp.isVocative()
        || t.hasTag('nomvoc'))],
  [`expl`,
    `з присудка`,
    (t, s, i) => canBePredicateOld(t, s, i),
    `в ${g.EXPL_FORMS.join('|')} — іменники`,
    t => g.EXPL_FORMS.includes(t.form.toLowerCase()) && t.interp.isNounish()],
  [`flat:name`, `з іменника`, t => t.interp.isNounish(), ``, t => t],
  [`advcl:`, ``, (t, s, i) => canBePredicateOld(t, s, i), `в присудок`, (t, s, i) => canBePredicateOld(t, s, i)],
  [`appos:`, `з іменника`, t => canActAsNoun(t), `в іменник`, t => canActAsNoun(t)],
]

const TREED_SIMPLE_RULES: [string, string, TreedSentencePredicate, string, TreedSentencePredicate][] = [
  // cc не в сурядний is a separate rule
  [`advmod`,
    ``, t => t,
    `в прислівник`, t => t.node.interp.isAdverb() || g.isAdvmodParticle(t)],
  [`det:`,
    `з іменника`,
    t => canActAsNounForObj(t) || t.node.hasTag('adjdet'),
    `в нечислівниковий DET`,
    t => toUd(t.node.interp).pos === 'DET' && !t.node.interp.isCardinalNumeral()],
  [`case`,
    `з іменника`,
    t => canActAsNounForObj(t)
      || t.isRoot() //&& todo: more than 1 root
      || t.node.interp.isAdjective() && t.node.interp.isRelative()  // todo: generalize
      || t.node.interp.isCardinalNumeral()  // todo
      || t.node.interp.isInfinitive() && t.node.hasTag('inf_prep')
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
    t => canBePredicate(t),
    `в іменникове`,
    t => canActAsNounForObj(t)
  ],
  [`csubj`,
    `з присудка чи валентного прикметника`,
    t => canBePredicate(t) || g.isValencyHavingAdjective(t.node),
    `в присудок`, t => canBePredicate(t)],
  [`obj`,
    `з присудка чи валентного прикметника`,
    t => canBePredicate(t) || g.isValencyHavingAdjective(t.node),
    `в іменникове`,
    t => canActAsNounForObj(t)],
  [`iobj`,
    `з присудка чи валентного прикметника`,
    t => canBePredicate(t) || g.isValencyHavingAdjective(t.node),
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
  [`nmod`, `з іменника`, t => canActAsNoun(t.node) || g.isDenUDen(t) /* temp */,
    `в іменник`,
    t => canActAsNounForObj(t)
      || t.node.interp.lemma === 'який' && isRelativeInRelcl(t)
      || g.isDenUDen(t.parent)  // temp
  ],
  [`aux`,
    `з дієслівного`, t => t.node.interp.isVerbial2()
      || t.node.interp.isAdverb() && t.children.some(x => g.SUBJECTS.some(subj => uEq(x.node.rel, subj))),
    `в ${g.AUX_LEMMAS.join('|')}`,
    t => g.AUX_LEMMAS.includes(t.node.interp.lemma)],
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
    `з присудка / валентного прикметника`,
    t => canBePredicate(t) || g.isInfValencyAdjective(t.node),
    `в інфінітив - присудок`,
    t => g.isInfinitiveAnalytically(t) && canBePredicate(t)
  ],
  [`ccomp`,
    `з присудка / валентного прикметника`,
    t => canBePredicate(t)
      || g.isInfinitiveAnalytically(t) && g.isInfValencyAdjective(t.node),
    `в присудок (тест: фінітний)`,
    t => canBePredicate(t)
      && !g.isInfinitiveAnalytically(t)
  ],
  [`xcomp:sp`,
    `з присудка`,
    t => canBePredicate(t),
    `в називний/орудний іменник/прикметник чи в „як щось“`,
    t => ((t.node.interp.isNominative() || t.node.interp.isInstrumental())
      && (t.node.interp.isNoun() || t.node.interp.isAdjective()))
      || g.canBeAsSomethingForXcomp2(t)
      || t.node.isGraft
  ],
  [`advcl:sp`,
    `з присудка`,
    t => canBePredicate(t),
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

interface ReoprtIf2Arg {
  n: GraphNode<Token>  // tree node
  t: Token  // token
  i: MorphInterp  // interp
  l: string  // lemma
  r: string  // relation
  c: GraphNode<Token>[]  // children
  p: GraphNode<Token>
  pt: Token
  pi: MorphInterp
  pl: string
  pr: string
}

type SentencePredicate = (x: Token, i?: number) => any
type SentencePredicate2 = (t: Token, s: Token[], i: number/*, node: GraphNode<Token>*/) => any
type TreedSentencePredicate = (t: GraphNode<Token>) => any
type TreedSentencePredicate2 = (a: ReoprtIf2Arg) => any
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

  const reportIf2 = (message: string, fn: TreedSentencePredicate2) => {
    problems.push(...mu(nodes).map(x => ({
      n: x,
      t: x.node,
      r: x.node.rel,
      i: x.node.interp,
      l: x.node.interp.lemma,
      c: x.children,
      p: x.parent,
      pi: x.parent && x.parent.node.interp,
      pt: x.parent && x.parent.node,
      pl: x.parent && x.parent.node.interp.lemma,
      pr: x.parent && x.parent.node.rel
    })).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
  }

  const xreportIf = (message: string, fn: TreedSentencePredicate) => undefined
  const xreportIf2 = (message: string, fn: TreedSentencePredicate2) => undefined
  const xoldReportIf = (message: string, fn: SentencePredicate) => undefined

  const hasDependantWhich = (i: number, fn: SentencePredicate) =>
    sentence.some((xx, ii) => xx.headIndex === i && fn(xx, ii))


  // ~~~~~~~ rules ~~~~~~~~

  // invalid roots
  if (sentenceHasOneRoot) {
    let udPos = toUd(roots[0].node.interp).pos
    if (g.POSES_NEVER_ROOT.includes(udPos)) {
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
        t => relMatcher(t.rel)
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
        t => relMatcher(t.node.rel)
          && !predicateFrom(t.parent))
    }
    if (messageTo && predicateTo) {
      reportIf(`${relName} не ${messageTo}`,
        t => relMatcher(t.node.rel)
          && !predicateTo(t))
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~ TESTS ~~~~~~~~~~~~~~~~~~~~~~

  xreportIf2(`_тест: числівники`,
    ({ t, i }) => t.indexInSentence < sentence.length - 1
      && i.isCardinalNumerish()
      && (t.indexInSentence === 0
        || !sentence[t.indexInSentence - 1].interp.isCardinalNumerish())
      && (sentence[t.indexInSentence + 1].interp.isCardinalNumerish()
        || t.interp.isNounNumeral())
  )

  xreportIf2(`_тест: складений порядковий`,
    ({ t, i }) => t.indexInSentence > 0
      && i.isOrdinalNumeral()
      && sentence[t.indexInSentence - 1].interp.isCardinalNumerish()
    // && (t.indexInSentence === 0
    //   || !sentence[t.indexInSentence - 1].interp.isCardinalNumerish())
    // && (sentence[t.indexInSentence + 1].interp.isCardinalNumerish()
    //   || t.interp.isNounNumeral())
  )

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  reportIf(`декілька підметів (${g.SUBJECTS.join('|')})`,
    t => t.children.filter(x => uEqSome(x.node.rel, g.SUBJECTS)).length > 1
  )
  reportIf(`декілька прямих додатків`,
    t => t.children.filter(x => uEqSome(x.node.rel, g.CORE_COMPLEMENTS)
      // || uEq(x.node.rel, 'xcomp') && x.node.rel !== 'xcomp:sp'
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
      && x.node.rel !== 'xcomp:sp').length > 1
  )
  reportIf(`декілька xcomp:sp`,
    t => t.children.filter(x => x.node.rel === 'xcomp:sp').length > 1
  )
  reportIf(`декілька cop’ів`,
    t => t.children.filter(x => uEq(x.node.rel, 'cop')).length > 1
  )
  reportIf(`декілька прийменників`,
    t => !t.node.isGraft
      && t.children.filter(x => uEq(x.node.rel, 'case')).length > 1
  )


  oldReportIf(`токен позначено error’ом`, t => t.hasTag('error'))

  oldReportIf('більше однієї стрілки в слово',
    tok => tok.deps.length > 1 && mu(tok.deps).count(x => x.relation !== 'punct'))

  g.RIGHT_POINTED_RELATIONS.forEach(rel => reportIf2(`${rel} ліворуч`,
    ({ r, t }) => uEq(r, rel) && t.headIndex > t.indexInSentence))
  g.LEFT_POINTED_RELATIONS.forEach(rel => reportIf2(`${rel} праворуч`,
    ({ r, t }) => uEq(r, rel) && t.headIndex < t.indexInSentence))

  oldReportIf(`case праворуч`, (t, i) => uEq(t.rel, 'case')
    && t.headIndex < i
    && !(sentence[i + 1] && sentence[i + 1].interp.isCardinalNumeral())
  )

  oldReportIf('невідома реляція',
    t => t.rel && !g.ALLOWED_RELATIONS.includes(t.rel as UdMiRelation))

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
    t => g.CONDITIONAL_AUX_LEMMAS.includes(t.form.toLowerCase())
      && t.interp.isParticle()
      && !['fixed', 'aux', undefined].includes(t.rel))

  reportIf('не advmod в не',
    t => t.node.interp.isParticle()
      && !g.hasChild(t, 'fixed')
      && ['не', /*'ні', 'лише'*/].includes(t.node.form.toLowerCase())
      && !['advmod', undefined].includes(t.node.rel))

  oldReportIf('не cc в сурядий на початку речення',
    (t, i) => t.rel && i === 0 && t.interp.isCoordinating() && !['cc'].includes(t.rel))


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


  for (let leafrel of g.LEAF_RELATIONS) {
    reportIf(`${leafrel} має залежників`,
      t => uEq(t.node.rel, leafrel)
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
    t => t.node.interp.isConjunction()
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
      && !(uEq(t.node.rel, 'obl') && g.isDenUDen(t))
    // && !t.children.some(x => isNumgov(x.node.rel))
    // && !t.children.some(x => x.node.interp.isAdverb())
  )

  reportIf(`місцевий без прийменника`,
    t => {
      if (!t.node.rel
        || uEq(t.node.rel, 'fixed')
        || !t.node.interp.isLocative()
        || !canActAsNoun(t.node)
      ) {
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
      && !uEqSome(t.parent.node.rel, ['conj', 'flat:title', 'flat:repeat', 'parataxis:newsent'])
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
      && !t.node.rel.endsWith(':sp')
  )

  xreportIf(`тест: зворотне має obj/iobj`,
    t => !t.isRoot()
      && uEqSome(t.node.rel, ['obj', 'iobj'])
      && t.parent.node.interp.isReversive()
      && !t.node.interp.isDative()
      && !t.node.interp.isGenitive()
      && !t.node.interp.isInstrumental()
  )


  // coordination

  reportIf(`неузгодження відмінків прийменника`,
    t => uEq(t.node.rel, 'case')
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
      && t.node.rel !== 'conj:parataxis'
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
      && t.node.rel !== 'conj:parataxis'
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


  xreportIf(`неузгодження підмет-присудок`,
    t => {
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
        && !(interp.isPronominal() && !interp.isPersonal() && !interp.hasFeature(f.Person))
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
        && !(interp.isPronominal() && g.GENDERLESS_PRONOUNS.includes(interp.lemma))
        && verbInterp.getFeature(f.Gender) !== interp.getFeature(f.Gender)
        && !g.isNegativeExistentialPseudosubject(t)
        && (!interp.isNoun() && interp.lemma === 'це')
      ) {
        // return true
      }

      if (!t.children.some(x => uEq(x.node.rel, 'conj'))
        && !g.hasNmodConj(t)
        && !t.node.hasTag('numdisagr')
        && !(t.node.interp.isPronominal() && !t.node.interp.hasNumber())
        && verbInterp.getFeature(f.MorphNumber) !== interp.getFeature(f.MorphNumber)
        && !(g.isNumeralModified(t)/*  && interp.isGenitive() */)
        && !verbInterp.isInstant()
      ) {
        return true
      }
    }
  )

  reportIf(`неузгодження іменник-прикметник`,
    t => {
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

  reportIf2(`неузгодження родів іменника-числівника`,
    ({ r, i, pi }) => uEq(r, 'nummod')
      && i.hasFeature(f.Gender)
      && i.getFeature(f.Gender) !== pi.getFeature(f.Gender)
      && !pi.isXForeign()
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
      && !g.canBeDecimalFraction(t)  // todo
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
    t => uEq(t.node.rel, 'mark')
      // && !t.parent.isRoot()
      && (sentenceHasOneRoot && !t.parent.node.rel
        || t.parent.node.rel
        && !uEqSome(t.parent.node.rel, g.MARK_ROOT_RELS)
        && !(uEq(t.parent.node.rel, 'conj')
          && g.SUBORDINATE_CLAUSES.some(x => uEq(t.parent.parent.node.rel, x))
        )
      )
      && !(t.node.indexInSentence === 0 && t.parent.isRoot())
  )

  reportIf(`parataxis під’єднано сполучником`,
    t => uEq(t.node.rel, 'parataxis')
      && t.node.rel !== 'parataxis:discourse'
      && t.node.rel !== 'parataxis:thatis'
      && t.children.some(x => uEqSome(x.node.rel, ['cc', 'mark']))
  )

  reportIf(`parataxis має відносний`,
    t => uEq(t.node.rel, 'parataxis')
      && t.node.rel !== 'parataxis:discourse'
      && g.hasOwnRelative(t)
  )

  reportIf(`xcomp зі сполучником`,
    t => uEq(t.node.rel, 'xcomp')
      // && t.node.rel !== 'parataxis:discourse'
      && t.children.some(x => uEqSome(x.node.rel, [/* 'cc',  */'mark']))
      && !g.canBeAsSomethingForXcomp2(t)
      && !t.node.hasTag('xcomp_mark')
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
    if (uEqSome(token.node.rel, g.CONTINUOUS_REL)) {
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
    && !/[!?]|\.\.\.|…/.test(lastToken.node.form)  // todo: add stricter condition
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
      && t.node.rel !== 'advcl:sp'
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
      && !(uEqSome(t.node.rel, ['aux']) && g.CONDITIONAL_AUX_LEMMAS.includes(t.node.interp.lemma))
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
        || t.parent.node.indexInSentence < t.node.indexInSentence
        || !t.parent.node.interp.isAdjective()
      )
  )

  reportIf(`:beforeadj не має дефіса-залежника`,
    t => t.node.interp.isBeforeadj()
      && !t.isRoot()
      && !t.children.some(x => /^[−\-\–\—]$/.test(x.node.interp.lemma)
        && x.node.indexInSentence > t.node.indexInSentence
      )
      && !t.node.hasTag('no_dash')
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
      && !uEqSome(t.node.rel, ['cc', 'fixed'])
  )

  reportIf(`неочікувана реляція в SCONJ`,
    t => t.node.rel
      && t.node.interp.isSubordinative()
      && !uEqSome(t.node.rel, ['mark', 'fixed'])
  )

  xreportIf(`неочікувана реляція в іменник`,
    t => t.node.rel
      && t.node.interp.isNoun()
      && !uEqSome(t.node.rel, ['nsubj', 'nmod', 'appos', 'conj', 'obj', 'iobj', 'obl',
        'flat:title', 'flat:name', 'xcomp:sp', 'flat:repeat', 'parataxis:discourse'])
      && !(uEqSome(t.node.rel, ['advcl']) && t.children.some(x => uEqSome(x.node.rel, ['mark'])))
      && !uEqSome(t.node.rel, [...g.CLAUSAL_MODIFIERS])  // todo
  )

  xreportIf(`неочікувана реляція в дієслово`,
    t => t.node.rel
      && !t.node.isGraft
      && t.node.interp.isVerb()
      && !t.node.interp.isAuxillary()
      && !uEqSome(t.node.rel, [...g.CLAUSAL_MODIFIERS, 'parataxis', 'conj', 'flat:repeat',
        'parataxis:discourse'])
  )

  reportIf(`неочікувана реляція в DET`,
    t => t.node.rel
      && !t.node.isPromoted
      && toUd(t.node.interp).pos === 'DET'  // todo: .isDet()
      && !uEqSome(t.node.rel, ['det', 'conj', 'fixed', 'advcl:sp'])
      && !isRelativeInRelcl(t)
  )

  xreportIf(`неочікувана реляція в кількісний числівник`,
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
        'flat:repeat', 'parataxis', 'appos'])
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
      && t.parent.node.interp.isPronominal()
      && !t.parent.node.interp.isIndefinite()
      && !t.parent.node.interp.isGeneral()
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
      && !t.parent.node.interp.isReversive()  // злякався кабана, стосується жителя
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

  reportIf2(`:animish з запереченням`,
    ({ i, p }) => p
      && i.isGrammaticallyAnimate()
      && g.isNegated(p)
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

  reportIf(`„більш/менш ніж“ не fixed`,
    t => g.COMPARATIVE_SCONJS.includes(t.node.form)
      && sentence[t.node.indexInSentence - 1]
      && g.COMPARATIVE_ADVS.includes(sentence[t.node.indexInSentence - 1].form)
      && !uEq(t.node.rel, 'fixed')
  )

  reportIf(`advcl під’єднане до порівняльного прислівника`,
    t => !t.isRoot()
      && (t.parent.node.interp.isComparable() || t.parent.node.interp.isAdjective())
      && g.hasChild(t, 'advcl')
      && t.node.interp.isAdverb()
      && t.node.interp.isComparative()
  )

  // reportIf2(`advcl під’єднане до порівняльного прислівника`,
  //   ({ n, pi, i }) => !n.isRoot()
  //     && pi.isAdjective()
  //     && g.hasChild(n, 'advcl')
  //     && i.isAdverb()
  //     && i.isComparative()
  // )

  reportIf(`питальний займенник без „?“`,
    t => !t.isRoot()
      && t.node.interp.isInterogative()
      && !thisOrConjHead(t, x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
      && !thisOrConjHead(t.parent, x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
      && !mu(t.walkThisAndUp0())
      //   .some(x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
      && !t.node.hasTag('no_qmark')
  )

  reportIf(`непитальний займенник з „?“`,
    t => !t.isRoot()
      && (t.node.interp.isRelative() || t.node.interp.isIndefinite())
      // && !t.node.interp.isInterogative()
      && thisOrConjHead(t, x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
    // && mu(t.walkThisAndUp0())
    //   .some(x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
    // && !t.node.hasTag('no_qmark')
  )

  reportIf(`неочікувана голова advmod`,
    t => uEq(t.node.rel, 'advmod')
      && t.node.rel !== 'advmod:amtgov'
      && t.node.rel !== 'advmod:a'
      && !t.parent.node.interp.isVerb()
      && !t.parent.node.interp.isAdverb()
      && !t.parent.node.interp.isAdjective()
      && !thisOrConjHead(t, x => uEq(x.parent.node.rel, 'obl'))
      && !g.isAdvmodParticle(t)
      && !g.hasChild(t.parent, 'nsubj')
      // && !g.hasCopula(t.parent)
      && !(t.parent.node.interp.isNoun() && t.parent.isRoot())
      && !(t.parent.node.interp.isCardinalNumeral()
        && ['приблизно', 'майже'].includes(t.node.interp.lemma))
  )

  xreportIf(`не flat:title в „№“`,
    t => t.node.interp.lemma.includes('№')
      && !t.isRoot()
      && !uEqSome(t.node.rel, ['flat:title', 'conj'])
  )

  reportIf(`не flat:title з „№“ в числівник`,
    t => !t.isRoot()
      && t.parent.node.interp.lemma.includes('№')
      && t.node.interp.isCardinalNumeral()
      && !uEqSome(t.node.rel, ['flat:title'])
  )

  reportIf(`_тест: еліпс наперед`,
    t => t.node.comment
      && t.node.comment.includes('еліпс наперед')
  )

  reportIf2(`невказівне _тому_ вжите як вказівне`,
    ({ n, l, pr, i }) => l === 'тому'
      && !i.isDemonstrative()
      && !n.isRoot()
      && uEqSome(pr, g.SUBORDINATE_CLAUSES)
      && !uEqSome(pr, ['ccomp'])
      && !g.hasChild(n, 'obl')
  )

  reportIf2(`вказівне _тому_ вжите як часове`,
    ({ t, pr, n, l }) => l === 'тому'
      && t.interp.isDemonstrative()
      && (uEq(pr, 'obl') || g.hasChild(n, 'obl'))
  )

  // symmetrical to English
  reportIf2(`N часу тому — _тому_ не голова`,
    ({ t, pr }) => t.interp.lemma === 'тому'
      && !t.interp.isDemonstrative()
      && uEq(pr, 'obl')
  )

  reportIf2(`порядковий числівник при місяці`,
    ({ r, t, i, pl }) => uEq(r, 'amod')
      && i.isOrdinalNumeral()
      && g.MONTHS.includes(pl)
  )

  // яке, що
  xreportIf2(`неузгодження acl`,
    ({ r, c }) => uEq(r, 'acl')
      && c.some(x => x.node.interp.lemma === 'який')
    // &&
  )

  reportIf2(`flat:conjpack не з conj`,
    ({ r, pr }) => r === 'flat:conjpack'
      && !uEq(pr, 'conj')
  )

  xreportIf2(`іменник-числівник має неочікувані залежники`,
    ({ i, c }) => i.isNounNumeral()
      && (c.length > 1 || c.length && c[0].node.rel !== 'nmod')
  )

  reportIf2(`прислівник _може_ не discourse`,
    ({ n, i, r }) => i.lemma === 'може'
      && i.isAdverb()
      && !uEq(r, 'discourse')
      && !n.isRoot()
  )

  reportIf(`більше ніж один тип імені в пучку`,
    t => !t.node.hasTag('multi_names')
      && Object.values(
        _.groupBy(
          t.children.filter(x => x.node.rel === 'flat:name'),
          x => x.node.interp.getFeature(f.NameType)))
        .some(x => x.length > 1)
  )

  xreportIf2(`тест: наказовий має підмет`,
    ({ pi, r }) => uEqSome(r, g.SUBJECTS)
      && pi.isImperative()
  )



  // ************  obj/iobj vs obl  ************** //

  reportIf('obj/iobj має прийменник',
    t => uEqSome(t.node.rel, ['obj', 'iobj'])
      && g.hasChild(t, 'case')
  )

  // disablable
  // only temporals allowed
  xreportIf(`неорудний obl без прийменника`,
    t => uEq(t.node.rel, 'obl')
      && t.node.rel !== 'obl:agent'
      && !t.node.hasTag('prepless_obl')
      && !t.node.isPromoted
      && !hasChildrenOfUrel(t, 'case')
      && !t.node.interp.isInstrumental()
      && !(
        (t.node.interp.isAccusative() || t.node.interp.isGenitive())
        && g.TEMPORAL_ACCUSATIVES.includes(t.node.interp.lemma)
      )
  )

  xreportIf(`орудний obl без прийменника`,
    t => uEq(t.node.rel, 'obl')
      && t.node.rel !== 'obl:agent'
      && !t.node.hasTag('prepless_obl')
      // && !t.node.isPromoted
      && !hasChildrenOfUrel(t, 'case')
      && t.node.interp.isInstrumental()
  )

  reportIf(`неочікуваний відмінок obj`,
    t => uEqSome(t.node.rel, ['obj'])
      && !t.node.isGraft
      && !(t.node.interp.isForeign() && !t.node.interp.hasCase())
      && g.thisOrGovernedCase(t) !== f.Case.accusative
      && g.thisOrGovernedCase(t) !== f.Case.genitive
      && !(g.thisOrGovernedCase(t) === f.Case.instrumental
        && g.WORDS_WITH_INS_VALENCY.includes(t.parent.node.interp.lemma)  // ~
      )
      // legacy
      && !(t.node.interp.isDative()
        && !t.parent.children.some(x => uEq(x.node.rel, 'iobj'))
      )
    // && !t.parent.node.interp.isReversive()  // todo
  )

  reportIf(`неочікуваний відмінок iobj`,
    t => uEq(t.node.rel, 'iobj')
      && !t.node.isGraft
      && g.thisOrGovernedCase(t) !== f.Case.dative
      && !(t.node.interp.isForeign() && !t.node.interp.hasCase())
      && !(
        t.parent.children.some(x => uEq(x.node.rel, 'obj')
          && g.thisOrGovernedCase(x) === f.Case.genitive
        )
        && g.thisOrGovernedCase(t) === f.Case.accusative
      )
      && !g.hasSiblink(t, 'ccomp')
  )

  reportIf(`неочікуваний відмінок obl`,
    t => uEq(t.node.rel, 'obl')
      && !t.node.isGraft
      && !(t.node.interp.isForeign() && !t.node.interp.hasCase())
      && (g.thisOrGovernedCase(t) === f.Case.nominative
        || g.thisOrGovernedCase(t) === f.Case.vocative
      )
      && !g.isDenUDen(t)
  )

  reportIf(`cop/aux в наказовому`,
    t => uEqSome(t.node.rel, ['cop', 'aux'])
      && t.node.interp.isImperative()
  )

  reportIf(`наказовий має cop/aux`,
    t => t.node.interp.isImperative()
      && t.children.some(x => uEqSome(x.node.rel, ['cop', 'aux']))
  )

  xreportIf2(`велика літера не власна`,
    ({ t, i }) => t.indexInSentence > 0
      && startsWithCapital(t.getForm())
      && !i.isProper()
      && !i.isAbbreviation()
  )

  reportIf2(`не родовий однини після десяткового`,
    ({ r, n, pi }) => uEq(r, 'nummod')
      && g.canBeDecimalFraction(n)
      && (pi.isPlural() || pi.getFeature(f.Case) !== f.Case.genitive)
  )

  reportIf2(`числівник має неочікувані (?) залежники`,
    ({ r, c }) => uEq(r, 'nummod')
      && c.some(x => !uEqSome(x.node.rel, ['compound']))
  )

  // **********


  // reportIf2(`_test: тераса за терасою`,
  //   ({ n, i, r }) => !uEq(r, 'nsubj')
  //     && i.isNominative()

  // t => ['obj', 'iobj', 'obl'].some(x => uEq(t.node.rel, x))
  //   && g.thisOrGovernedCase(t) === f.Case.nominative
  //   && !t.node.interp.isXForeign()
  //   && !t.node.isGraft
  //   && t.parent.node.interp.isReversive()
  //   && !(uEq(t.node.rel, 'obl') && g.isTerasaZaTerasoyu(t))
  // // && !t.children.some(x => isNumgov(x.node.rel))
  // // && !t.children.some(x => x.node.interp.isAdverb())
  // )


  // наістотнення
  // treedReportIf(`obj в родовому`,
  //   (t, i) => uEq(t.node.rel, 'obj')
  //     && t.node.interp.isGenitive()
  //     && !t.children.some(x => isNumgov(x.node.rel))
  //     && !t.parent.node.interp.isNegative()
  //     && !t.parent.children.some(x => uEq(x.node.rel, 'advmod') && x.node.interp.isNegative())
  // )


  // ** done **
  // конкеретні дозволені відмінки в :gov-реляціях


  // остання крапка не з кореня
  // коми належать підрядним: Подейкують,
  // conj в "і т. д." йде в "д."
  // mark не з підкореня https://lab.mova.institute/brat/index.xhtml#/ud/prokhasko__opovidannia/047
  // якщо коренем є NP, і в кінці "!", то корінь і конжі мають бути кличними
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
  // вказують як синонім — xcomp:sp
  // кома-риска з-від праворуч
  // між двома inf коли друге без спол не підр зв
  // тобто, цебто, а саме, як-от, або, чи (у значенні “тобто”)
  // десяткові дроби однина
  // parataxis починається з великої
  // тому тільки з advcl і аналогічно з іншими демами і релами
  // більш ніж X — який відмінок X?
  // давальний сам — iobj
  // спосіб треба знайти такий, щоб — звідки acl?
  // далі - блабла - orphan
  // як з може, тільки з рештою вставних
  // день у день з’єднано nmod’ом
  // 31 січня — що 31 порядковий!
  // наш з мамою — consistency
  // заповнюйте форму: http:// — consistency
  // підрядні без спол/рел
  // експли не з іменників
  // це <nsubj _ чи навпаки?
  // _будьте свідомі_ — що не буває копул в наказовому?
  // коли перед cc кома насправді зі звороту _, щоб…, але_
  // у graft йдуть тільки не clausal
  // одне одного доповнюють — obl, а не nsubj коли _вони_ пропущене
  // давальний самому — advcl:sp чи таки iobj?
  // obl чи advcl в inf_prep?
  // коми в складених присудках
  // закривні розділові зі своїх боків
  // будь ласка
  // стала роллю — щоб не obj замість xcomp:sp
  // ins obj з якимоось ще obj
  // NON_CHAINABLE_RELS
  // const NEVER_CONJUNCT_POS = [ 'PUNCT', 'SCONJ' ]
  // ins valency навпаки
  // однакове в дробах
  // spaceafter=no між двома словами
  // більше 30-ти літрів — більше до літрів




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
    .find(x => uEqSome(x.node.rel, g.CLAUSE_RELS))

  if (!clauseRoot) {
    return false
  }

  if (uEq(clauseRoot.node.rel, 'acl')) {
    return true
  }

  if (clauseRoot.node.interp.isInfinitive()) {
    clauseRoot = mu(clauseRoot.walkUp0())
      .find(x => uEqSome(x.node.rel, g.CLAUSE_RELS))
  }

  return clauseRoot && uEq(clauseRoot.node.rel, 'acl')
}

//------------------------------------------------------------------------------
function hasChildrenOfUrel(node: GraphNode<Token>, urel: string) {
  return node.children.some(x => uEq(x.node.rel, urel))
}

//------------------------------------------------------------------------------
function thisOrConjHead(node: GraphNode<Token>, predicate: TreedSentencePredicate) {
  for (let t of node.walkThisAndUp0()) {
    if (!uEq(t.node.rel, 'conj')) {
      return predicate(t)
    }
  }
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
function isContinuous(array: Array<number>) {
  for (let i = 1; i < array.length; ++i) {
    if (array[i] - array[i - 1] !== 1) {
      return false
    }
  }
  return true
}

//------------------------------------------------------------------------------
function canBePredicate(t: GraphNode<Token>) {
  let token = t.node
  let interp = token.interp
  return token.isPromoted
    || t.isRoot()
    || uEq(token.rel, 'parataxis')
    || interp.isXForeign()
    || interp.isVerbial()
    // || interp.isAdverb()
    || g.hasChild(t, 'nsubj')
    || g.hasChild(t, 'csubj')
    || g.hasChild(t, 'cop')
  // || (t.children.some(x => uEq(x.node.rel, 'cop'))
  //   && (interp.isNounish() || interp.isAdjective())
  //   && (interp.isNominative() || interp.isInstrumental() || interp.isLocative())
  // )
  // || ((interp.isNounish() || interp.isAdjective()) && interp.isNominative())
}

//------------------------------------------------------------------------------
function canBePredicateOld(token: Token, sentence: Token[], index: number) {
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
    || g.CLAUSAL_MODIFIERS.includes(token.rel)
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
