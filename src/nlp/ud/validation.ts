import { Token } from '../token'
import { toUd } from './tagset'
import { UdMiRelation } from './syntagset'
import { mu } from '../../mu'
import { GraphNode, walkDepth, walkDepthNoSelf } from '../../graph'
import { MorphInterp } from '../morph_interp'
import { last, arrayed, wiith } from '../../lang'
import { uEq, uEqSome } from './utils'
import { startsWithCapital } from '../../string'
import { MorphAnalyzer } from '../morph_analyzer/morph_analyzer'
import { PREDICATES, isNumericModifier, isGoverning, EnhancedNode } from './uk_grammar'
import { ValencyDict } from '../valency_dictionary/valency_dictionary'
import * as f from '../morph_features'
import * as g from './uk_grammar'

import { groupBy } from 'lodash'
import { SimpleGrouping } from '../../grouping'
import { compareAscending } from '../../algo'



//------------------------------------------------------------------------------
const SIMPLE_RULES: Array<[string, string, SentencePredicate2, string, SentencePredicate2]> = [
  [`discourse`,
    undefined,
    undefined,
    `в ${g.DISCOURSE_DESTANATIONS.join('|')} чи fixed`,
    (t, s, i) => g.DISCOURSE_DESTANATIONS.includes(toUd(t.interp).pos) || s[i + 1] && s[i + 1].rel === 'fixed'],
  [`cop`,
    `з недієслівного`,
    (t, s, i) => !t.interp.isVerb() && !t.interp.isConverb() /* && !isActualParticiple(t, s, i) */,
    `в ${g.COPULA_LEMMAS.join(' ')}`,
    t => g.COPULA_LEMMAS.includes(t.interp.lemma)],
  // [`obl:agent`, `з присудка`, (t, s, i) => canBePredicate(t, s, i), `в іменник`, t => canActAsNoun(t)],

  [`expl`,
    `з присудка`,
    (t, s, i) => canBePredicateOld(t, s, i),
    `в ${g.EXPL_FORMS.join('|')} — іменники`,
    t => g.EXPL_FORMS.includes(t.form.toLowerCase()) && t.interp.isNounish()],
  [`flat:name`, `з іменника`, t => t.interp.isNounish(), ``, t => t],
]

//------------------------------------------------------------------------------
const TREED_SIMPLE_RULES: Array<[string | Array<string>, string, TreedSentencePredicateParent, string, TreedSentencePredicate]> = [
  // cc не в сурядний is a separate rule
  [`advcl:`,
    `з дієслова/прикметника/прислівника`, t => g.isFeasibleAdvclHead(t),
    `в присудок`, t => g.hasPredication(t)],
  [`advcl:sp`,
    `з присудка`,
    t => canBePredicate(t),
    `в називний/орудний іменник/прикметник`,
    t => (t.node.interp.isNominative() || t.node.interp.isInstrumental())
      && (t.node.interp.isNoun() || t.node.interp.isAdjective())
  ],
  [`amod`, `з іменника`, t => canActAsNoun(t), `в прикметник без предикації`, t => t.node.interp.isAdjective() && !g.hasPredication(t)],
  [`nummod`, `з іменника`, t => canActAsNoun(t), `в незайменниковий числівник`, t => t.node.interp.isCardinalNumeral() && !t.node.interp.isPronominal()],
  [`det:numgov`, `з іменника`, t => canActAsNoun(t), `в займенниковий числівник`, t => t.node.interp.isCardinalNumeral() && t.node.interp.isPronominal()],
  [`advmod:`,
    `див. "неочікуваний advmod"`, t => t,
    `в прислівник`, t => t.node.interp.isAdverb() || g.isAdvmodParticle(t) || uEq(t.node.rel, 'fixed')
  ],
  [`advmod:amtgov`,
    `з родового`, t => t.node.interp.isGenitive(),
    `в числівниковий прислівник`, t => t.node.interp.isAdverb() && g.QAUNTITATIVE_ADVERBS.includes(t.node.interp.lemma)
  ],
  [`advmod:det`,
    `з прикметника"`, t => t.node.interp.isAdjective(),
    `в DET _такий_/_якийсь_`, t => toUd(t.node.interp).pos === 'DET'
      && ['такий', 'такенький', 'якийсь'].includes(t.node.interp.lemma)
  ],
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
      || t.node.interp.isAdjective() && !uEq(t.node.rel, 'amod')  // temp
      || t.node.interp.isAdverb() && ['тоді', 'нікуди'].includes(t.node.interp.lemma)
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
  [`nsubj:x`,
    `з чистого xcomp’а`,
    t => t.node.rel === 'xcomp',
    `в іменникове`,
    t => canActAsNounForObj(t)
  ],
  [`nsubj:xsp`,
    `з xcomp:sp’а`,
    t => t.node.rel === 'xcomp:sp',
    `в іменникове`,
    t => canActAsNounForObj(t)
  ],
  [`csubj`,
    `з присудка чи валентного прикметника`,
    t => canBePredicate(t) || g.isValencyHavingAdjective(t.node),
    `в присудок`, t => canBePredicate(t)],
  [`obj`,
    `з присудка чи валентного прикметника`,
    t => t.node.interp.isVerbial() || g.isValencyHavingAdjective(t.node),
    `в іменникове`,
    t => canActAsNounForObj(t) /* || canTheoreticallyActAsNoun(t) */],
  [`iobj`,
    `з присудка чи валентного прикметника`,
    t => canBePredicate(t) || g.isDativeValencyAdjective(t.node),
    `в іменникове`,
    t => canActAsNounForObj(t) /* || canTheoreticallyActAsNoun(t) */],
  [`obl`,
    `з дієслова / прикм. / присл. / недієсл. присудка`,
    t => t.node.interp.isVerbial2()
      || t.node.interp.isAdverb()
      || (t.node.interp.isAdjective() && !t.node.interp.isPronominal())
      || g.isNonverbialPredicate(t)
    ,
    `в іменник`,
    t => canActAsNounForObj(t)
      || t.node.interp.lemma === 'який' && (
        g.findRelativeClauseRoot(t) || t.parent.node.rel === 'flat:pack'
      )
      || /* t.node.interp.isAdjective() && t.node.interp.isPronominal()
      && */ g.hasChild(t, 'flat:rcp')
    ,
  ],
  [`nmod`, `з іменника`, t => canActAsNoun(t) || g.isDenUDen(t) /* temp */,
    `в іменник`,
    t => canActAsNounForObj(t)
      || t.node.interp.lemma === 'який' && g.findRelativeClauseRoot(t)
      || g.isDenUDen(t.parent)  // temp
      || canTheoreticallyActAsNoun(t)
  ],
  [`aux`,
    `з дієслівного`, t => t.node.interp.isVerbial2()
      || t.node.interp.isAdverb() && t.children.some(x => g.SUBJECTS.some(subj => uEq(x.node.rel, subj))),
    `у ${g.AUX_LEMMAS.join('|')}`,
    t => g.AUX_LEMMAS.includes(t.node.interp.lemma)],
  [`acl`, `з іменника`, t => canActAsNoun(t)
    || (!uEq(t.node.rel, 'det')
      && [
        f.PronominalType.demonstrative,
        f.PronominalType.general,
        f.PronominalType.indefinite
      ].includes(t.node.interp.getFeature(f.PronominalType))),
    `в присудок/інфінітив/:relless/:adv`, t =>
      g.hasPredication(t)
      || t.node.interp.isInfinitive()
      || t.node.rel === 'acl:relless'  // todo: comprehend
      || t.node.rel === 'acl:adv'
  ],
  [`acl:adv`, `з іменника`, t => canActAsNoun(t)
    || (!uEq(t.node.rel, 'det')
      && [
        f.PronominalType.demonstrative,
        f.PronominalType.general,
        f.PronominalType.indefinite,
      ].includes(t.node.interp.getFeature(f.PronominalType))),
    `в одинокий (діє)прислівник`, t =>
      (t.node.interp.isAdverb() || t.node.interp.isConverb())
      && !t.hasChildren()
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
    t => (g.isInfinitiveVerbAnalytically(t) || g.hasInfinitiveCop(t)) && canBePredicate(t)
  ],
  [`ccomp`,
    `з присудка / валентного прикметника`,
    t => canBePredicate(t)
      || g.isInfinitiveVerbAnalytically(t) && g.isInfValencyAdjective(t.node)
      || g.isValencyHavingAdjective(t.node),
    `в присудок (тест: фінітний)`,
    t => canBePredicate(t)
      && !g.isInfinitiveVerbAnalytically(t)
      && !t.node.hasTag('inf-ccomp')
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
  [`vocative`,
    `з присудка`,
    t => canBePredicate(t),
    `в кличний іменник`,
    t => t.node.interp.isXForeign()
      || t.node.interp.isForeign()
      || canActAsNoun(t) && (t.node.interp.isVocative()
        || t.node.hasTag('nomvoc')
      )
  ],
  [`appos:`, `з іменника`, t => canActAsNoun(t), `в іменник`, t => canActAsNoun(t)],
  [`dislocated`, `~з присудка`, t => canBePredicate(t), ``, t => t],
]

//------------------------------------------------------------------------------
interface ReoprtIf2Arg {
  n: GraphNode<Token>  // tree node
  t: Token  // token
  i: MorphInterp  // interp
  l: string  // lemma
  r: string  // relation
  c: Array<GraphNode<Token>>  // children
  p: GraphNode<Token>
  pt: Token
  pi: MorphInterp
  pl: string
  pr: string
}

//------------------------------------------------------------------------------
type SentencePredicate = (x: Token, i?: number) => any
type SentencePredicate2 = (t: Token, s: Array<Token>, i: number/*, node: GraphNode<Token>*/) => any
type TreedSentencePredicate = (t: GraphNode<Token>) => any
type TreedSentencePredicateParent = (parent: GraphNode<Token>, child?: GraphNode<Token>) => any
type TreedSentencePredicate2 = (a: ReoprtIf2Arg) => any

////////////////////////////////////////////////////////////////////////////////
export interface Problem {
  message: string
  indexes: Array<number>
}

////////////////////////////////////////////////////////////////////////////////
export function validateSentenceSyntax(
  nodes: Array<GraphNode<Token>>,
  manualEnhancedNodes: Array<EnhancedNode>,
  analyzer: MorphAnalyzer,
  corefClusterization: SimpleGrouping<Token>,
  valencyDict?: ValencyDict,
) {
  let problems = new Array<Problem>()

  let tokens = nodes.map(x => x.node)
  let roots = nodes.filter(x => x.isRoot())
  let basicRoots = roots.filter(x => !x.node.isElided())
  let sentenceHasOneRoot = roots.length === 1
  let node2index = new Map(nodes.map((x, i) => [x, i] as [GraphNode<Token>, number]))

  const oldReportIf = (message: string, fn: SentencePredicate) => {
    problems.push(...mu(tokens).findAllIndexes(fn).map(index => ({ message, indexes: [index] })))
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
    tokens.some((xx, ii) => xx.headIndex === i && fn(xx, ii))


  // ~~~~~~~ rules ~~~~~~~~

  // invalid roots
  if (sentenceHasOneRoot) {
    let udPos = toUd(roots[0].node.interp).pos
    if (g.POSES_NEVER_ROOT.includes(udPos)) {
      problems.push({ indexes: [node2index.get(roots[0])], message: `${udPos} як корінь` })
    }
  }

  if (0) {
    let interesting = tokens.filter(x =>
      (['один', 'другий'].includes(x.interp.lemma))
      && x.rel !== 'flat:rcp'
    )
    if (interesting.length > 1) {
      problems.push({ indexes: interesting.map(x => x.index), message: `flat:rcp?` })
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
          && !tokens[t.headIndex].interp0().isXForeign()
          && !predicateFrom(tokens[t.headIndex], tokens, t.headIndex))
    }

    if (messageTo && predicateTo) {
      oldReportIf(`${relName} не ${messageTo}`,
        (t, i) => relMatcher(t.rel)
          && !t.interp0().isXForeign()
          && !predicateTo(t, tokens, i))
    }
  }

  // treed simple rules
  for (let [rels, messageFrom, predicateFrom, messageTo, predicateTo] of TREED_SIMPLE_RULES) {
    rels = arrayed(rels)
    for (let rel of rels) {
      let relMatcher = rel[0].endsWith(':')
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
  }

  // ~~~~~~~~~~~~~~~~~~~~~~ TESTS ~~~~~~~~~~~~~~~~~~~~~~

  xreportIf2(`_тест: числівники`,
    ({ t, i }) => t.index < tokens.length - 1
      && i.isCardinalNumerish()
      && (t.index === 0
        || !tokens[t.index - 1].interp.isCardinalNumerish())
      && (tokens[t.index + 1].interp.isCardinalNumerish()
        || t.interp.isNounNumeral())
  )

  xreportIf2(`_тест: складений порядковий`,
    ({ t, i }) => t.index > 0
      && i.isOrdinalNumeral()
      && tokens[t.index - 1].interp.isCardinalNumerish()
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
    t => t.children.filter(x => !x.node.isElided()
      && uEqSome(x.node.rel, g.CORE_COMPLEMENTS)
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

  reportIf('більше однієї стрілки в токен',
    t => mu(t.node.deps)
      .filter(x => !uEq(x.relation, 'punct')
        && !g.HELPER_RELATIONS.has(x.relation)
        && !tokens[x.headIndex].isElided()  // todo
      ).count() > 1)

  g.RIGHT_POINTED_RELATIONS.forEach(rel => reportIf2(`${rel} ліворуч`,
    ({ r, t }) => uEq(r, rel) && t.headIndex > t.index))
  g.LEFT_POINTED_RELATIONS.forEach(rel => reportIf2(`${rel} праворуч`,
    ({ r, t }) => uEq(r, rel) && t.headIndex < t.index))

  oldReportIf(`case праворуч`, (t, i) => uEq(t.rel, 'case')
    && t.headIndex < i
    && !(tokens[i + 1] && tokens[i + 1].interp.isNumeric())
  )

  oldReportIf('незнана реляція',
    t => t.rel && !g.ALLOWED_RELATIONS.includes(t.rel as UdMiRelation))

  reportIf(`cc не в сурядний`,
    t => uEq(t.node.rel, 'cc')
      && !t.node.interp.isCoordinating()
      && !g.hasChild(t, 'fixed')
  )

  reportIf(`punct в двокрапку зліва`,
    t => t.node.index !== tokens.length - 1  // not last in sentence
      && t.node.form === ':'
      && t.node.interp.isPunctuation()
      && t.node.headIndex < t.node.index
      && !(t.parent
        && (uEqSome(t.parent.node.rel, ['discourse'])
          || t.parent.node.rel === 'parataxis:discourse')
      )
  )

  xoldReportIf(`у залежника ccomp немає підмета`,
    (t, i) => t.rel === 'ccomp'
      && !tokens.some(xx => g.SUBJECTS.includes(xx.rel) && xx.headIndex === i))

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

  reportIf('не aux у б(и)',
    t => !t.isRoot()
      && g.CONDITIONAL_AUX_LEMMAS.includes(t.node.form.toLowerCase())
      && t.node.interp.isParticle()
      && !uEqSome(t.node.rel, [/* 'fixed', */ 'aux', 'goeswith'])
  )

  reportIf('не advmod в не',
    t => t.node.interp.isParticle()
      && !g.hasChild(t, 'fixed')
      && ['не', /*'ні', 'лише'*/].includes(t.node.form.toLowerCase())
      && !['advmod', undefined].includes(t.node.rel))

  oldReportIf('не cc в сурядий на початку речення',
    (t, i) => t.rel && i === 0 && t.interp.isCoordinating() && !['cc'].includes(t.rel))


  for (let leafrel of g.LEAF_RELATIONS) {
    reportIf(`${leafrel} має залежників`,
      t => uEq(t.node.rel, leafrel)
        && (uEqSome(t.node.rel, ['cop', 'aux'])
          ? !t.children.every(x => x.node.interp.isPunctuation()
            || x.node.interp.lemma === 'не'
            || x.node.interp.lemma === 'б' && x.node.interp.isParticle()
            || x.node.interp.lemma === 'би' && x.node.interp.isParticle()
          )
          : !t.children.every(x => x.node.interp.isPunctuation())
        )
    )
  }

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
      && !t.node.hasTag('ok-nonnom-subj')
      && ![f.Case.nominative, undefined].includes(g.thisOrGovernedCase(t))
      && !t.node.interp.isForeign()
      && !g.isQuantificationalNsubj(t)
      && !g.isQuantitativeAdverbModified(t)
      && !(t.children.some(x => g.isNumericModifier(x.node.rel)
        && x.children.some(xx => xx.node.interp.isPreposition()
          && ['близько', 'до', 'понад'].includes(xx.node.interp.lemma)
        ))
      )
  )

  reportIf(`день у день`, t => g.isDenUDen(t))

  reportIf(`займенник :&noun`, t =>
    t.node.interp.isAdjectiveAsNoun()
    && t.node.interp.isPronominal()
  )

  reportIf(`додаток в називному`,
    t => uEqSome(t.node.rel, ['obj', 'iobj', 'obl'])
      && g.thisOrGovernedCase(t) === f.Case.nominative
      && !t.node.interp.isXForeign()
      && !t.node.isGraft
      && t.parent.node.interp.isReversive()
      && !t.children.some(x => x.node.rel === 'flat:rcp')
  )

  reportIf(`місцевий без прийменника`,
    t => {
      if (!t.node.rel
        || uEq(t.node.rel, 'fixed')
        || !t.node.interp.isLocative()
        || !canActAsNoun(t)
      ) {
        return
      }
      let p = t
      while (p && !hasChildrenOfUrel(p, 'case')) {
        if (!uEqSome(p.node.rel, ['appos', 'conj', 'flat'])) {
          return true
        } else {
          p = p.parent
        }
      }
    }
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
      // && !g.isInfinitive(t)
      && !(uEq(t.node.rel, 'acl') && t.node.interp.isParticiple())
      && !(uEq(t.node.rel, 'advcl') && t.node.interp.isConverb())
      && !t.node.rel.endsWith(':sp')
  )

  reportIf(`зворотне має два додатки`,
    t => t.node.interp.isReversive()
      && t.children.filter(x => uEqSome(x.node.rel, ['obj', 'iobj', 'ccomp'])).length > 1
  )

  reportIf(`неузгодження відмінків прийменника`,
    t => uEq(t.node.rel, 'case')
      && (t.node.interp.features.requiredCase as number) !== g.thisOrGovernedCase(t.parent)
      && !t.parent.node.interp.isXForeign()
      && !t.parent.node.interp.isForeign()  // todo
      && !t.parent.node.isGraft
      //   &&!t.children.some(x => uEq(x.node.rel, 'case')
      //   && x.node.interp.getFeature(f.RequiredCase)===
      // )
      && !g.hasChild(t.parent, 'fixed')
      && !(t.node.interp.lemma === 'замість'
        && t.parent.node.interp.isVerb()
        && t.parent.node.interp.isInfinitive()
      )
      && !(t.parent.node.interp.isAdverb()
        && ['нікуди'].includes(t.parent.node.interp.lemma)
      )
  )

  reportIf(`неособове має підмет`,
    t => (t.node.interp.isImpersonal() || g.isInfinitive(t))
      && t.children.some(x => uEqSome(x.node.rel, g.SUBJECTS))
  )

  reportIf(`знахідний без прийменника від недієслова`,
    t => canActAsNounForObj(t)
      && !t.isRoot()
      && t.node.interp.isAccusative()
      && !t.parent.node.interp.isAccusative()
      && !t.parent.node.isGraft
      && !t.children.some(x => x.node.interp.isPreposition())
      && !t.parent.node.interp.isVerbial2()
      && !uEqSome(t.node.rel, ['conj', 'flat', 'appos', 'orphan', 'fixed'])  // todo
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
    )
  }

  reportIf2(`aux-інфінітив з дієслова-інфінітива`,
    ({ r, i, pi }) => uEq(r, 'aux')
      && i.isInfinitive()
      && pi.isInfinitive()
  )

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

  xreportIf(`неочікуваний відмінок іменника-присудка`,
    t => uEq(t.node.rel, 'nsubj')
      && t.parent.node.interp.isNounish()
      // && !g.nounNounAgreed(t.node.interp, t.parent.node.interp)
      && !t.parent.node.interp.isNominative()
      && !g.hasChild(t.parent, 'case')
      && !(t.parent.node.interp.isInstrumental() && g.hasCopula(t.parent))
    // && !['це'].some(x => t.node.interp.lemma === x)
  )

  xreportIf(`неузгодження прикладки`,  // todo: mark explicitly in tb
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

  reportIf(`неузгодження підмет — присудок-дієслово`, t =>
    uEq(t.node.rel, 'nsubj')
    && t.parent.node.interp.isVerb()
    && !g.nsubjAgreesWithPredicate(t, t.parent)
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
        && !interp.isMock()
        && !t.parent.node.isGraft
        && !nounInterp.isXForeign()
        && (
          (interp.hasGender()
            && interp.features.gender !== nounInterp.features.gender
            // && !t.parent.node.isPromoted
            && !g.GENDERLESS_PRONOUNS.includes(nounInterp.lemma)
            && !(interp.isOrdinalNumeral() && nounInterp.lemma === 'рр.')
          )
          || (interp.features.case !== nounInterp.features.case
            && interp.features.case !== g.thisOrGovernedCase(t.parent)
          )
        )
        // виділяють три основних елементи
        && !(interp.isGenitive()
          && [f.Case.accusative, f.Case.nominative].includes(t.parent.node.interp.getFeature(f.Case))
          && t.parent.children.some(x => x.node.rel === 'nummod')
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

  reportIf(`неузгодження flat:title`,
    t => t.node.rel === 'flat:title'
      // && !g.nounNounAgreed(t.parent.node.interp, t.node.interp)
      && !t.parent.node.interp.equalsByFeatures(t.node.interp, [/* f.MorphNumber, */ /* f.Gender, */ f.Case])
      && g.thisOrGovernedCase(t) !== f.Case.nominative
      && !t.node.interp.isForeign()
      && !t.node.interp.isSymbol()
      && !t.node.isGraft
      && !isEncolsedInQuotes(t)
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
      && !['один', 'півтора', 'пів'].includes(t.node.interp.lemma)
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
      && !(t.parent.isRoot() && t.node.index === nodes.findIndex(x =>
        !x.node.interp.isPunctuation() && !mu(x.walkThisAndUp0()).some(
          xx => uEqSome(xx.node.rel, ['discourse'])))
      )
      // використання як енергетичної сировини
      && !(t.parent.node.rel === 'nmod:xcompsp'
        && ['як'].includes(t.node.interp.lemma)
      )
  )

  reportIf(`parataxis під’єднано сполучником`,
    t => uEq(t.node.rel, 'parataxis')
      && t.node.rel !== 'parataxis:discourse'
      && t.node.rel !== 'parataxis:thatis'
      && t.node.rel !== 'parataxis:rel'
      && t.node.rel !== 'parataxis:newsent'
      && t.children.some(x => uEqSome(x.node.rel, ['cc', 'mark']))
      && !t.children.some(x => x.node.interp.isQuote() && x.node.interp.isOpening())
  )

  reportIf(`parataxis має відносний`,
    t => uEq(t.node.rel, 'parataxis')
      && t.node.rel !== 'parataxis:rel'
      && t.node.rel !== 'parataxis:discourse'
      && g.hasOwnRelative(t)
  )

  reportIf(`parataxis:rel не має відносного`,
    t => t.node.rel === 'parataxis:rel'
      && !g.hasOwnRelative(t)
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

  reportIf(`підряне речення з _то_`,
    t => t.node.interp.lemma === 'то'
      && t.parent
      && uEqSome(t.parent.node.rel, g.SUBORDINATE_CLAUSES)
      && !t.node.interp.isNoun()
      // todo: fasten
      && !t.parent.children.some(x => uEqSome(x.node.rel, ['advcl']/* g.SUBORDINATE_CLAUSES */))
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

  if (basicRoots.length === 1) {
    xreportIf(`non-projective`, g.isNonprojective)
  }

  // continuity/projectivity
  for (let token of nodes) {
    if (uEqSome(token.node.rel, g.CONTINUOUS_REL)) {
      let rootFromHere = token.root()

      let indexes = mu(walkDepth(token))
        .map(x => node2index.get(x))
        .toArray()
        .sort(compareAscending)

      let holes = findHoles(indexes)
        .filter(i => nodes[i].root() === rootFromHere)
        .map(x => nodes[x])
        .filter(x => !mu(x.walkThisAndUp0()).some(xx => xx.node.hasTag('legal_alien'))
          && !x.node.isElided()
        )
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

  {
    let lastToken = last(nodes)
    if (lastToken.node.rel
      && !/[!?]|\.{3}|…/.test(lastToken.node.form)  // todo: add stricter condition
      && lastToken.node.interp.isPunctuation()
      && !lastToken.parents.some(x => x.isRoot())
      && !lastToken.parents.some(x => x.node.interp.isAbbreviation()
        || uEq(x.node.rel, 'parataxis')
        || x.node.rel.endsWith(':parataxis')
      )
      && !lastToken.node.interp.isQuote()
      && !(lastToken.node.interp.isForeign() && lastToken.parent.node.form.length === 1)
      && !lastToken.parent.node.isGraft
      && !(lastToken.node.interp.isClosing()
        && lastToken.parent.children.some(x => x.node.interp.isOpening())
      )
      && !(lastToken.node.interp.isQuote()
        && mu(lastToken.parent.children)
          .filter(x => x.node.interp.isQuote())
          .longerThan(1)
      )
    ) {
      problems.push({
        indexes: [nodes.length - 1],
        message: `останній розділовий не з кореня`,
      })
    }
  }

  {
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

  reportIf(`conj без сполучника чи коми`,
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
        || t.parent.node.index < t.node.index
        || !t.parent.node.interp.isAdjective()
      )
  )

  reportIf(`:beforeadj не має дефіса-залежника`,
    t => t.node.interp.isBeforeadj()
      && !t.isRoot()
      && !t.children.some(x => /^[−\-\–\—]$/.test(x.node.interp.lemma)
        && x.node.index > t.node.index
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
      && !(uEq(t.node.rel, 'cop') && g.COPULA_LEMMAS.includes(t.node.interp.lemma))
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

  reportIf(`неочікувана реляція в дієслово`,
    t => t.node.rel
      && !t.node.isGraft
      && t.node.interp.isVerb()
      && !t.node.interp.isAuxillary()
      && !uEqSome(t.node.rel, [...g.CLAUSE_RELS, 'conj'])
      && !['compound:svc', 'orphan', 'flat:repeat', 'flat:pack'].includes(t.node.rel)
      && !(uEq(t.node.rel, 'appos') && t.node.interp.isInfinitive())
      && !(uEq(t.node.rel, 'obl') && t.node.hasTag('inf_prep'))
  )

  reportIf(`неочікувана реляція в DET`,
    t => t.node.rel
      // && !t.node.isPromoted
      && toUd(t.node.interp).pos === 'DET'  // todo: .isDet()
      && !uEqSome(t.node.rel, ['det', 'conj', 'fixed', 'xcomp:sp', 'advcl:sp'])
      && !uEqSome(t.node.rel, ['nsubj', 'obj', 'iobj', 'obl', 'nmod'])
      && !uEqSome(t.node.rel, ['advmod:det', 'flat:rcp'])
      && !g.findRelativeClauseRoot(t)
  )

  // todo
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
      && !uEqSome(t.node.rel, ['discourse', 'parataxis', 'orphan'])
      && !uEqSome(t.parent.node.rel, ['obl'])
      && t.node.rel !== 'acl:adv'
      && !t.parent.children.some(x => uEqSome(x.node.rel, ['nsubj', 'cop']))
      && !t.node.interp.isNegative()
      && !g.isQuantitativeAdverbModifier(t)
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

  reportIf(`означення при займеннику`,
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
      && !t.node.hasTag('right-nummod')
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
      && t.node.index > t.parent.node.index
  )

  reportIf(`неочікуваний відмінок nmod`,
    t => uEqSome(t.node.rel, ['nmod'])
      && t.node.interp.isAccusative()
      && !g.hasChild(t, 'case')
      && !t.children.some(x => x.node.interp.lemma === '/'
        && x.node.index < t.node.index)
      && !(t.parent.node.interp.isParticiple()
        && t.parent.node.interp.isActive())
  )

  xreportIf(`неочікуваний орудний nmod`,
    t => uEqSome(t.node.rel, ['nmod'])
      && t.node.interp.isInstrumental()
      && !g.hasChild(t, 'case')
    // && !g.SOME_DATIVE_VALENCY_NOUNS.has(t.parent.node.interp.lemma)
  )

  reportIf(`неочікуваний давальний nmod`,
    t => uEqSome(t.node.rel, ['nmod'])
      && t.node.interp.isDative()
      && !g.SOME_DATIVE_VALENCY_NOUNS.has(t.parent.node.interp.lemma)
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
      && g.thisOrGovernedCase(t) === f.Case.genitive
      && t.parent.node.interp.isVerbial()
      && !g.isNegated(t.parent)
      && !t.parent.node.interp.isReversive()  // злякався кабана, стосується жителя
      && !g.isQuantitativeAdverbModified(t)  // багато дощу
      && !(t.parent.node.interp.isInfinitive()
        && t.parent.parent
        && t.parent.parent.children.some(x => x.node.interp.isNegative())
      )
      // пішло до 10 штук
      && !t.children.some(x => uEq(x.node.rel, 'nummod') && g.hasChild(x, 'case'))
      // same form in acc exists
      && analyzer.tag(t.node.form).some(x => x.isAccusative()
        && !x.isGrammaticallyAnimate()
        && x.equalsByLemmaAndFeatures(
          t.node.interp, [f.Pos, f.MorphNumber, f.Gender, f.Animacy])
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

  reportIf(`„більш/менш ніж“ не fixed`,
    t => g.COMPARATIVE_SCONJS.includes(t.node.form)
      && tokens[t.node.index - 1]
      && g.COMPARATIVE_ADVS.includes(tokens[t.node.index - 1].form)
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
      && t.node.interp.isInterrogative()
      && !g.thisOrConjHead(t, x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
      && !g.thisOrConjHead(t.parent, x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
      && !mu(t.walkThisAndUp0())
      //   .some(x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
      && !t.node.hasTag('no_qmark')
  )

  reportIf(`непитальний займенник з „?“`,
    t => !t.isRoot()
      && (t.node.interp.isRelative() || t.node.interp.isIndefinite())
      // && !t.node.interp.isInterrogative()
      && g.thisOrConjHead(t, x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
    // && mu(t.walkThisAndUp0())
    //   .some(x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
    // && !t.node.hasTag('no_qmark')
  )

  reportIf(`неочікуваний advmod`,
    t => uEq(t.node.rel, 'advmod')
      && t.node.rel !== 'advmod:amtgov'
      && !g.isFeasibleAdvmod(t.parent, t)
  )

  // reportIf(`неочікуване advcl`,
  //   t => uEq(t.node.rel, 'advcl')
  //     // && t.node.rel !== 'advmod:amtgov'
  //     && !g.isFeasibleAdvcl(t.parent, t)
  // )

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

  reportIf(`еліпс наперед`,
    t => t.node.comment
      && t.node.comment.toLowerCase().includes('еліпс наперед')
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

  reportIf(`flat:pack не з conj / не з присудка`, t =>
    t.node.rel === 'flat:pack'
    && !uEq(t.parent.node.rel, 'conj')
    && !t.parent.children.some(x => uEqSome(x.node.rel, ['conj', 'nsubj']))
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
        groupBy(
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
        && g.INS_VALENCY_VERBS.includes(t.parent.node.interp.lemma)  // ~
      )
      // legacy
      && !(t.node.interp.isDative()
        && !t.parent.children.some(x => uEq(x.node.rel, 'iobj'))
      )
    // && !t.parent.node.interp.isReversive()  // todo
  )

  reportIf(`орудний obl в орудному дієслові`,
    t => uEqSome(t.node.rel, ['obl'])
      && g.thisOrGovernedCase(t) === f.Case.instrumental
      && g.INS_VALENCY_VERBS.includes(t.parent.node.interp.lemma)
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
      && !(t.node.interp.isNominative()
        && g.hasChild(t, 'flat:rcp')
      )
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
      && !t.node.hasTag('ok-imp-cop')
  )

  reportIf(`наказовий має cop/aux`,
    t => t.node.interp.isImperative()
      && t.children.some(x => uEqSome(x.node.rel, ['cop', 'aux']))
  )

  xreportIf2(`велика літера не власна`,
    ({ t, i }) => t.index > 0
      && startsWithCapital(t.getForm())
      && !i.isProper()
      && !i.isAbbreviation()
  )

  reportIf2(`не родовий однини після десяткового`,
    ({ r, n, pi }) => uEq(r, 'nummod')
      && g.canBeDecimalFraction(n)
      && (pi.isPlural() || pi.getFeature(f.Case) !== f.Case.genitive)
  )

  reportIf2(`неочікуваний залежник nummod’ду`,  // todo
    ({ r, pr, i, n, pi }) => pr
      && g.isNumericModifier(pr)
      && !uEqSome(r, ['compound', 'conj', 'discourse', 'punct'])
      && r !== 'flat:range'
      && !(uEq(r, 'case')
        && ['від', 'до', 'близько', 'понад', 'коло'].includes(i.lemma)
      )
      && !(uEq(r, 'advmod')
        && ['не', 'ні', /* <- todo */ 'майже', '~',
          'щонайменше', 'приблизно', 'принаймні'].includes(i.lemma)
      )
      && !g.hasChild(n, 'fixed')  // todo
      && !(pi.isPronominal() && i.isAdverb() && ['так', 'дуже'].includes(i.lemma))
  )

  xreportIf2(`xcomp не має явного підмета`,
    ({ n, r, p }) => uEq(r, 'xcomp') && !g.findXcompSubject(n)
  )

  reportIf2(`потенційне _що її_ без кореференції чи #not-shchojiji`,
    ({ n, t }) => {
      if (t.hasTag('not-shchojiji')) {
        return false
      }
      let antecedent = g.findShchojijiAntecedent(n)
      if (!antecedent) {
        return false
      }
      return !corefClusterization.areSameGroup(antecedent.node, t)
    }
  )

  if (valencyDict) {
    reportIf(`неперехідне дієслово має додаток`,
      t => uEqSome(t.node.rel, ['obj'/* , 'iobj' */])
        && t.parent.node.interp.isVerb()
        && valencyDict.isIntransitiveOnlyVerb(t.parent.node.interp.lemma)
        && !(uEq(t.node.rel, 'obj') && t.node.interp.isDative())
        && !t.node.interp.isGenitive()
        && !(g.thisOrGovernedCase(t) === f.Case.instrumental
          && g.INS_VALENCY_VERBS.includes(t.parent.node.interp.lemma)
        )
        && !(g.thisOrGovernedCase(t) === f.Case.accusative
          && g.SOME_WORDS_WITH_ACC_VALENCY.has(t.parent.node.interp.lemma)
        )
        && !(t.parent.node.interp.isNeuter()
          && t.parent.node.interp.isReversive()
          && (valencyDict.isAmbigiousVerb(t.parent.node.interp.lemma.slice(0, -2))
            || g.SOME_WORDS_WITH_ACC_VALENCY.has(t.parent.node.interp.lemma.slice(0, -2))
          )
        )
    )

    xreportIf(`перехідне дієслово не має додатка`,
      t => t.node.interp.isVerb()
        && valencyDict.isAccusativeOnlyVerb(t.node.interp.lemma)
        && !thisOrConj(t, tt => tt.children.length
          && (tt.children.some(x => uEqSome(x.node.rel, g.CORE_COMPLEMENTS_XCOMP))
            || tt.children.some(x => uEq(x.node.rel, 'iobj')
              && x.node.interp.isDative()
            )
          )
        )
    )

    const johojiji = ['його', 'її', 'їх']
    const johojijiStr = ['його', 'її', 'їх'].join('/')

    xreportIf(`${johojijiStr}-прикметник замість іменника`,
      t => johojiji.includes(t.node.form.toLowerCase())
        && t.node.interp.isAdjective()
        && t.parent
        && t.parent.node.interp.isNoun()
        && valencyDict.isTransitiveOnlyGerund(t.parent.node.interp.lemma)
    )

    xreportIf(`${johojijiStr}-прикметник замість іменника (потенційно)`,
      t => johojiji.includes(t.node.form.toLowerCase())
        && t.node.interp.isAdjective()
        && t.parent
        && t.parent.node.interp.isNoun()
        && valencyDict.isAmbigiousGerund(t.parent.node.interp.lemma)
    )

    xreportIf(`${johojijiStr}-прикметник замість іменника (-ння)`,
      t => johojiji.includes(t.node.form.toLowerCase())
        && t.node.interp.isAdjective()
        && t.parent
        && t.parent.node.interp.isNoun()
        && t.parent.node.interp.lemma.endsWith('ння')
        && !valencyDict.hasGerund(t.parent.node.interp.lemma)
    )

    xreportIf(`${johojijiStr}-іменник замість прикметника`,
      t => johojiji.includes(t.node.form.toLowerCase())
        && t.node.interp.isNoun()
        && t.parent
        && t.parent.node.interp.isNoun()
        && valencyDict.isIntransitiveOnlyGerund(t.parent.node.interp.lemma)
    )

    xreportIf(`${johojijiStr}-іменник замість прикметника (потенційно)`,
      t => johojiji.includes(t.node.form.toLowerCase())
        && t.node.interp.isNoun()
        && t.parent
        && t.parent.node.interp.isNoun()
        && valencyDict.isAmbigiousGerund(t.parent.node.interp.lemma)
    )

    xreportIf(`${johojijiStr}-іменник замість прикметника (-ння)`,
      t => johojiji.includes(t.node.form.toLowerCase())
        && t.node.interp.isNoun()
        && t.parent
        && t.parent.node.interp.isNoun()
        && t.parent.node.interp.lemma.endsWith('ння')
        && !valencyDict.hasGerund(t.parent.node.interp.lemma)
    )

    {
      let cutoff = [...g.SUBORDINATE_CLAUSES, 'parataxis', 'conj']
      reportIf(`не єдиний відносний в підрядному реченні`,
        t => t.node.interp.isRelative()
          && t.parent
          && uEqSome(t.parent.node.rel, g.SUBORDINATE_CLAUSES)
          && mu(walkDepthNoSelf(t.parent, x => uEqSome(x.node.rel, cutoff)))
            .filter(x => x.node.interp.isRelative()
              // з ким і про що розмовляє президент
              && !(uEq(x.node.rel, 'conj') && x.parent.node.interp.isRelative())
            )
            .unique()  // shared-private paths
            .longerThan(1)
      )
    }

    reportIf2(`в звороті типу _вчити дитину математики_ переплутані patient з addressee`,
      ({ r, i, p }) => uEq(r, 'iobj')
        && i.isGenitive()
        && p.children.some(x => uEq(x.node.rel, 'obj')
          && x.node.interp.isAccusative()
        )
    )

    reportIf2(`чистий flat`,
      ({ r }) => r === 'flat'
    )

    reportIf2(`голова orphan’а не під’єднана до реконструкції пропуска`,
      ({ n, r }) => uEq(r, 'orphan')
        && !n.parent.parents.some(x => x.node.isElided())
    )

    reportIf2(`orphan не під’єднаний до реконструкції пропуска`,
      ({ n, r }) => uEq(r, 'orphan')
        && !n.parents.some(x => x.node.isElided())
    )

    reportIf2(`orphan в пропуск`,
      ({ r, t }) => uEq(r, 'orphan')
        && t.isElided()
    )

    reportIf2(`orphan з пропуска`,
      ({ pt, r }) => uEq(r, 'orphan')
        && pt.isElided()
    )

    reportIf2(`непід’єднаний пропуск`,
      ({ n, t }) => t.isElided() && n.isRoot() && !n.hasChildren()
    )

    // todo
    xreportIf(`ADV має іменникові інтерпретації`,
      t => t.node.interp.isAdverb()
        && analyzer.tag(t.node.form).some(x => x.isNoun() && !x.isVocative())
        && !g.VALID_ADVS_AMBIG_TO_NOUN.has(t.node.form.toLowerCase())
        && !t.node.interp.isAbbreviation()
    )

    /* reportIf(`wrong promotion precedence`,
      t => {
        if (!t.node.hasUDep('orphan')) {
          return
        }
        let basicParent = t.parents.find(x => uEq(x.node.rel, 'orphan') && !x.node.isElided())
        if (!basicParent) {
          return
        }
      }
    ) */

    reportIf2(`Promoted не прикметник`,
      ({ n, t, i }) => t.isPromoted
        && !i.isAdjectivish()
        && !i.isCardinalNumeral()
        && !n.parents.some(x => x.node.isElided())
        && !t.hasTag('promoted-not-adj')
    )

    reportIf2(`токен позначено “ожеледиця”`,
      ({ t }) => t.comment
        && t.comment.toLowerCase().includes('ожеледиця')
        && !t.comment.toLowerCase().includes('лжеожеледиця')
    )

    reportIf(`недієслівна предикація праворуч`, t =>
      uEqSome(t.node.rel, ['nsubj'/* , 'csubj' */])
      && t.node.index > t.parent.node.index
      && !t.parent.node.interp.isVerbial()
      && !t.parent.node.interp.isInstrumental()
      && !t.parent.node.interp.isInterrogative()
      && !t.parent.node.interp.isAdjective()  // ~
      && !g.hasChild(t.parent, 'expl')
      && !t.node.hasTag('pred-right')
    )

    reportIf(`присудок є залежником`, t =>
      uEqSome(t.node.rel, ['nsubj', 'csubj', 'cop'])
      && t.parent.parent
      && !uEqSome(t.parent.node.rel, [...g.CLAUSE_RELS, 'conj'])
      && !t.parent.node.isGraft
      && !['compound:svc', 'orphan'].includes(t.parent.node.rel)
    )

    if (sentenceHasOneRoot) {
      let sentenceWithoutPunct = tokens.filter(x => !x.interp.isPunctuation())
      let skip = sentenceWithoutPunct.length === 1
      // && [
      //   f.Pos.noun,
      //   f.Pos.particle,
      //   f.Pos.interjection,
      //   f.Pos.cardinalNumeral,
      //   f.Pos.sym,
      // ].includes(sentenceWithoutPunct[0].interp.getFeature(f.Pos))
      if (!skip) {
        reportIf(`корінь без предикації`, t =>
          t.isRoot()
          && !t.node.hasTag('itsubj')
          && !t.node.interp.isInfinitive()  // todo
          && !t.children.some(x => uEqSome(x.node.rel, g.SUBJECTS))
          && !(t.node.interp.isVerb() && !g.isInfinitive(t))
        )
      }
    }

    // disablable
    xreportIf(`такий xxx не advmod:det`, t =>
      g.ADVMOD_DETS.has(t.node.interp.lemma)
      && t.node.interp.isAdjective()
      && (t.parent || sentenceHasOneRoot)
      && tokens[t.node.index + 1]
      && !(t.parent === nodes[t.node.index + 1] && t.node.rel === 'advmod:det')
      && tokens[t.node.index + 1].interp.equalsByFeatures(
        t.node.interp, [f.Pos, f.Case, f.Gender])
    )

    xreportIf(`advmod:det в непорівнюване`, t =>
      t.node.rel === 'advmod:det'
      && !t.parent.node.interp.isComparable()
    )

    reportIf(`advcl під’єднане напряму до вказівного`, t =>
      uEq(t.node.rel, 'advmod')
      && t.node.interp.isDemonstrative()
      && t.children.some(x => uEq(x.node.rel, 'advcl'))
    )

    reportIf(`advcl під’єднане не напряму до вказівного`, t =>
      uEq(t.node.rel, 'advmod')
      && t.node.interp.isDemonstrative()
      && t.parent.children.some(x => uEq(x.node.rel, 'advcl'))
    )

    reportIf(`неочікуваний клей між цим і наступним словом`, t =>
      t.node.index < tokens.length - 1
      && t.node.gluedNext
      && !g.areOkToBeGlued(t, nodes[t.node.index + 1])
      && !t.node.hasTag('ok-glued-next')
    )

    reportIf(`дискурсивне слово не discourse`, t =>
      !t.isRoot()
      && !uEqSome(t.node.rel, ['discourse'])
      && ['наприклад'].includes(t.node.interp.lemma)
    )

    reportIf(`:relfull має сполучник`, t =>
      t.node.rel === 'acl:relfull'
      && g.hasChild(t, 'mark')
    )

    reportIf(`:relfull без Rel`, t =>
      t.node.rel === 'acl:relfull'
      && !nodes.some(x => g.findRelativeClauseRoot(x) === t)
    )

    xreportIf(`особовий в :irrel з _що_`, t =>
      t.node.interp.isPersonal()
      && wiith(mu(t.walkThisAndUp0()).find(x => x.node.rel === 'acl:irrel'), acl =>
        acl
        && acl.children.some(x => uEq(x.node.rel, 'mark') && x.node.interp.lemma === 'що')
      )
    )

    reportIf(`нерозрізнений acl зі сполучником _що_`, t =>
      uEq(t.node.rel, 'acl')
      && t.children.some(x => uEq(x.node.rel, 'mark') && x.node.interp.lemma === 'що')
      && !g.isRelativeSpecificAcl(t.node.rel)
    )

    xreportIf(`нерозрізнений acl зі сполучником іншим від _що_`, t =>
      uEq(t.node.rel, 'acl')
      && t.children.some(x => uEq(x.node.rel, 'mark') && x.node.interp.lemma !== 'що')
      && !g.isRelativeSpecificAcl(t.node.rel)
    )

    xreportIf(`нерозрізнений acl без сполучника`, t =>
      uEq(t.node.rel, 'acl')
      && !t.children.some(x => uEq(x.node.rel, 'mark'))
      && !g.isRelativeSpecificAcl(t.node.rel)
      && !['acl:adv'].includes(t.node.rel)
    )

    reportIf(`відносний _що_ у acl:relfull`, t =>
      t.node.form === 'що'
      && t.node.interp.isRelative()
      && wiith(g.findRelativeClauseRoot(t), relclRoot =>
        relclRoot && relclRoot.node.rel === 'acl:relfull'
      )
    )

    xreportIf(`відносний ADV в нерозрізненому acl’і`, t =>
      t.node.interp.isRelative()
      && t.node.interp.isAdverb()
      && wiith(g.findRelativeClauseRoot(t), relclRoot =>
        relclRoot && relclRoot.node.rel === 'acl'
      )
    )

    reportIf(`acl:relless не має назаднього nsubj/obj`, t =>
      t.node.rel === 'acl:relless'
      && !manualEnhancedNodes[t.node.index].outgoingArrows.some(x =>
        x.end.node.index === t.parent.node.index
        && uEqSome(x.attrib, ['obj', 'nsubj']))
    )

    reportIf(`acl:relpers без ref`, t =>
      t.node.rel === 'acl:relpers'
      && !manualEnhancedNodes[t.parent.node.index].outgoingArrows.some(x => x.attrib === 'ref')
    )

    reportIf(`відносний в нерозрізненому acl’і`, t =>
      t.node.interp.isRelative()
      && !t.node.interp.isAdverb()
      && wiith(g.findRelativeClauseRoot(t), relclRoot =>
        relclRoot && relclRoot.node.rel === 'acl'
      )
    )

    reportIf(`відносний в acl:irrel`, t =>
      wiith(g.findRelativeClauseRoot(t), relclRoot =>
        relclRoot && relclRoot.node.rel === 'acl:irrel'
      )
    )

    if (0) {
      let relRoots = nodes.filter(x => x.node.interp.isRelative())
        .map(x => g.findRelativeClauseRoot(x))
      relRoots.filter((x, i) => relRoots.find((xx, ii) => ii !== i && xx === x))
        .forEach(x => problems.push({
          indexes: [x.node.index],
          message: `не єдиний відносний`,
        }))
    }

    // todo: це — дірки
    reportIf(`xcomp без enhanced підмета`, t =>
      // uEqSome(t.node.rel, ['xcomp'])
      t.node.rel === 'xcomp'
      && !manualEnhancedNodes[t.node.index].outgoingArrows.some(x => uEqSome(x.attrib, g.SUBJECTS))
      && t.ancestors0()
        .takeWhile(x => !uEqSome(x.node.rel, ['amod'])
          && !x.node.interp.isConverb()
          && !g.isRelativeSpecificAcl(x.node.rel)
          && !uEqSome(x.node.rel, g.CLAUSE_RELS)
        )
        .some(x => x.children.some(xx => uEqSome(xx.node.rel, g.CORE_ARGUMENTS)))
    )

    reportIf(`xcomp:sp без enhanced підмета`, t =>
      // uEqSome(t.node.rel, ['xcomp'])
      t.node.rel === 'xcomp:sp'
      && !manualEnhancedNodes[t.node.index].outgoingArrows.some(x => uEqSome(x.attrib, g.SUBJECTS))
      && t.ancestors0()
        .takeWhile(x => !uEqSome(x.node.rel, ['amod'])
          && !x.node.interp.isConverb()
          && !g.isRelativeSpecificAcl(x.node.rel)
          && !uEqSome(x.node.rel, g.CLAUSE_RELS)
        )
        .some(x => x.children.some(xx => uEqSome(xx.node.rel, g.CORE_ARGUMENTS)))
    )

    reportIf(`advcl:sp без enhanced підмета`, t =>
      t.node.rel === 'advcl:sp'
      && !manualEnhancedNodes[t.node.index].outgoingArrows.some(x => uEqSome(x.attrib, ['nsubj:asp']))
      && t.ancestors0()
        .some(x => x.children.some(xx => uEqSome(xx.node.rel, g.CORE_ARGUMENTS)))
    )

    reportIf(`сам не obl/det`, t =>
      t.node.interp.lemma === 'сам'
      && !t.isRoot()
      && !uEqSome(t.node.rel, ['obl', 'det'])
    )

    reportIf(`емфатичний займенник (забули розбити?)`, t =>
      t.node.interp.isEmphatic()
    )

    xreportIf(`flat має неочікувані залежники`, t =>
      t.parent
      && !t.parent.node.isGraft
      && uEq(t.parent.node.rel, 'flat')
      // && t.parent.node.rel !== 'flat:pack'
      // && !uEqSome(t.node.rel, ['conj', 'flat', 'punct'])
      && uEqSome(t.node.rel, g.CLAUSE_RELS)
    )

    // trash >>~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    {
      xoldReportIf(`:pass-реляція?`,
        t => !t.isPromoted
          && ['aux', 'csubj', 'nsubj'].includes(t.rel)
          && tokens[t.headIndex]
          && isPassive(tokens[t.headIndex].interp))  // todo: навпаки
      xoldReportIf(`:obl:agent?`,
        (t, i) => !t.isPromoted
          && t.rel === 'obl'
          && t.interp.isInstrumental()
          && isPassive(tokens[t.headIndex].interp)
          && !hasDependantWhich(i, xx => uEq(xx.rel, 'case')))
      xreportIf(`flat:range?`,
        t => uEqSome(t.node.rel, ['conj'])
          && t.children.some(x => /[-–—]/.test(x.node.form) && x.node.index < t.node.index)
      )
      xreportIf2(`_test: тераса за терасою`,
        ({ i, r }) => !uEq(r, 'nsubj')
          && i.isNominative()
      )
    }
  }

  // **********

  // на те , хто і як слухатиме його (L=те&!те >acl:relfull _)
  // two dets of the same type
  // куди треба їй піти — csubj vs xcomp
  // це втрата obj> свободи
  // узгодження з рефом
  // acl з відносним замість питального
  // `obl` в `Acc`: _зробив раз_ і навпаки `(Acc !>case _) <obl _`
  // вживання _тому_
  // щоб не навішували на батьків `xcomp`’ів й `csubj`’ів зайвого
  // enforce тип і бік розділових
  // `X` не `:foreign`
  // проставити `:prop` для UD щоб виконати `PROPN`?
  // проглянути `obl`’и без прийменників на можливі прямі додатки
  // 1. проглянути `obj`’і в не знахідному і `iobj`’і в не давальному на можливі `obl`’и
  // no orphans in enhanced
  // ref не з :relpers
  // Про те як часто чи згідно якої системи Поліція Думок смикає — не відносні — відносні без відносності
  // від міста Южноукраїнська , що в Миколаївській області — acl було з Южноукраїнська
  // acl:rel either have explicit rel or (що-SCONJ and are subject), if що is object, it's PRON
  // що SCONJ vs PRON
  // thisOrGovernedCase скрізь
  // _від 0 до 512 байтів даних_ — що flat:range?
  // For that reason, we usually make the complement an advcl,
  //   with the second as analyzed as a mark.
  //   — advcl:cmp
  // набувати майнових та особистих немайнових прав — було еліпсом наперед ззамість
  //   flat:pack
  // xcomp з нема
  // punct-nonproj має сенс
  // goeswith не йде в _пів_
  // flat:pack не з conj
  // flat:pack не з nummod etc
  // посунути пропуски _до_ риски
  // найкращий за всю історію — що з найкращий
  // по-третє discourse
  // близько 830 осіб — з нумерала
  // cop з flat:pack
  // один одного :rcp has PronType=
  // Час від часу — перший час називний
  // так само
  // lemmas for punct types
  // зробили реконструкцію, але забули зробити орфанами obl’и
  // conj:upperlevel з conj
  // словник xcomp:sp
  // може проводитись, якщо — advcl з може
  // окрім
  // надійшли рішення Дорогичівської сільської ради Заліщицького району — рішення в однині
  // рішення № 100 "Про дещо"
  // словник fixed’ів
  // If the expression modifies a counted noun phrase, it attaches directly to the modified number
  // прислівник з інтерп-іменником
  // on enhanced deps
  // в пропуску немає сироти
  // чиє тире від сироти
  // orphan не може мати неслужбових депс?
  // порядок промоушна
  // conj:parataxis vs parataxis, nesting:
  //   Її учителем української мови був Василь Щурат , біологію викладав Мельник , а географію викладала Олена Степанів .
  // orphan і замінник consistency
  // не orphan
  // ділитися чим — obl чи obj?
  // доти, поки — поки має бути ADV, а не SCONJ
  // conj vs parataxis без sharing: Пішли, увійшли в ліс.
  // ще
  // літом/зимою NOUN vs ADV
  // cop чи aux з прислівника?
  // найкращий в чомусь — обл і прикм, а не ім і нмод?
  // корінь — NP (чи взагалі без предикації)
  // що в що не день — займенник? http://sum.in.ua/s/shho
  // вугілля настільки бракує , що за два тижні можливе віялове відключення
  // оті _Так,_ на початку речення
  // conj:parataxis рівень
  // мусить щосьробити, щоб не _ — з мусить?
  // ні сполучник :neg
  // злидні кинулись всі до дерева — всі advcl:sp чи просто det?
  // :repeat між однаковими
  // відмінки в іменниковій предикації
  // ccomp/obj з _можливо_
  // зловити <w lemma="&quot;Westworld&quot;" ana="x:foreign">"Westworld"</w>
  // в conj:repeat всі shared
  // _немає_ з підметом
  // hyphen з пробілами
  // перечепити shared залежники до конжа і перевалідувати
  // conj з verb в noun
  // неузгодження не-private conj модифікаторів: https://lab.mova.institute/brat/#/ud/pryklady__nikoho/07?focus=T23
  // не hypen між прикладками
  // остання крапка не з кореня
  // коми належать підрядним: Подейкують,
  // conj в "і т. д." йде в "д."
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
  // advcl входить в вузол з то
  // з правого боку приклаки не виходить зовнішнє
  // appos’и йдуть пучком, а не як однорідні
  // у нас блаблабла, тому… — блаблабла має бути advcl
  // obl:agent безособового має бути :anim
  // знак питання і чи кріпляться до одного
  // підмети чи присудки не бувають неоднорідні
  // ? з того, з чого виходить fixed не може виходити нічого крім fixed
  // вказівні, з яких не йде щось
  // питальні без питання
  // abbr => nv
  // тоді, коли — щоб advcl йшло з тоді
  // відносні promoted
  // опікуватися мамою — мамою тут obj має бути?
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
  // так захопився, що — з вказівних advcl а не з кореня (що робити з порівняннями?)
  // Крім світлин , я крав рогалики — заборонити advcl(, світлин)
  // conj:parataxis не коли однорідні підрядні
  // ціль завбільшки з табуретку — consistent acl
  // рослина висотою сантиметр — flat:title?
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
  // експли не з іменників
  // це <nsubj _ чи навпаки?
  // _будьте свідомі_ — що не буває копул в наказовому?
  // коли перед cc кома насправді зі звороту _, щоб…, але_
  // у graft йдуть тільки не clausal
  // давальний самому — advcl:sp чи таки iobj?
  // obl чи advcl в inf_prep?
  // коми в складених присудках
  // закривні розділові зі своїх боків
  // будь ласка
  // стала роллю — щоб не obj замість xcomp:sp
  // ins obj з якимоось ще obj
  // NON_CHAINABLE_RELS
  // const NEVER_CONJUNCT_POS = [ 'PUNCT', 'SCONJ' ]
  // однакове в дробах

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


  return problems
}

//------------------------------------------------------------------------------
function hasChildrenOfUrel(node: GraphNode<Token>, urel: string) {
  return node.children.some(x => uEq(x.node.rel, urel))
}

//------------------------------------------------------------------------------
function thisOrConj(node: GraphNode<Token>, predicate: TreedSentencePredicate) {
  let nodes = [node]
  if (uEq(node.node.rel, 'conj')) {
    nodes.push(node.parent)
  }
  for (let x of nodes) {
    if (predicate(x)) {
      return true
    }
  }
  return false
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
  return t.isRoot()
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
function canBePredicateOld(token: Token, sentence: Array<Token>, index: number) {
  return !token.hasDeps()
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
function canActAsNoun(node: GraphNode<Token>) {
  return node.node.interp.isNounish()
    || node.node.isPromoted && (node.node.interp.isAdjectivish() || node.node.interp.isCardinalNumeral())
    || node.node.hasTag('graft')
    || node.node.interp.isXForeign()
    || node.node.interp.isSymbol()
}

//------------------------------------------------------------------------------
function canTheoreticallyActAsNoun(node: GraphNode<Token>) {
  return node.node.interp.isAdjectivish() // && !node.hasChildren()
}

//------------------------------------------------------------------------------
function canActAsNounForObj(node: GraphNode<Token>) {
  return canActAsNoun(node)
    || !node.isRoot()
    && node.node.interp.isRelative()
    && g.thisOrConjHead(node, n => isSubordiateRoot(n.parent.node))
    || node.node.interp.lemma === 'той'
    && node.node.interp.isDemonstrative()
    || (node.node.interp.isAdjective()
      && node.node.interp.isPronominal()
      && ['один'].includes(node.node.interp.lemma)
      && node.children.some(x => x.node.rel === 'flat:rcp')
    )
}

//------------------------------------------------------------------------------
function isActualParticiple(token: Token, sentence: Array<Token>, index: number) {
  return token.interp.isParticiple() && ['obl:agent', /*'advcl', 'obl', 'acl', 'advmod'*/].some(x => sentence.some(xx => xx.headIndex === index && xx.rel === x))
}

//------------------------------------------------------------------------------
function isEncolsedInQuotes(node: GraphNode<Token>) {
  let ret = node.children.length > 2
    && node.children[0].node.interp.isQuote()
    && last(node.children).node.interp.isQuote()

  return ret
}
