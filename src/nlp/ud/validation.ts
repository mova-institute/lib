import { compareAscending } from '../../algo'
import { GraphNode, walkDepth, walkDepthNoSelf } from '../../graph'
import { SimpleGrouping } from '../../grouping'
import { arrayed, last, wiith, wiithNonempty } from '../../lang'
import { mu } from '../../mu'
import { startsWithCapital } from '../../string'
import { MorphAnalyzer } from '../morph_analyzer/morph_analyzer'
import * as f from '../morph_features'
import { MorphInterp } from '../morph_interp'
import { Token } from '../token'
import { MultitokenDescriptor } from '../utils'
import { ValencyDict } from '../valency_dictionary/valency_dictionary'
import { UdMiRelation } from './syntagset'
import { toUd } from './tagset'
import * as g from './uk_grammar'
import {
  EnhancedArrow,
  EnhancedNode,
  isGoverning,
  isNumericModifier,
  PREDICATES,
} from './uk_grammar'
import { uEq, uEqSome } from './utils'

import { groupBy } from 'lodash'

const SIMPLE_RULES: Array<
  [string, string, SentencePredicate2, string, SentencePredicate2]
> = [
  [
    `discourse`,
    undefined,
    undefined,
    `в ${g.DISCOURSE_DESTANATIONS.join('|')} чи fixed`,
    (t, s, i) =>
      g.DISCOURSE_DESTANATIONS.includes(toUd(t.interp).pos) ||
      (s[i + 1] && s[i + 1].rel === 'fixed'),
  ],
  [
    `cop`,
    `з недієслівного`,
    (t, s, i) =>
      !t.interp.isVerb() &&
      !t.interp.isConverb() /* && !isActualParticiple(t, s, i) */,
    `в ${g.COPULA_LEMMAS.join(' ')}`,
    (t) => g.COPULA_LEMMAS.includes(t.interp.lemma),
  ],

  [
    `expl`,
    `з присудка`,
    (t, s, i) => canBePredicateOld(t, s, i),
    `в ${g.EXPL_FORMS.join('|')} — іменники`,
    (t) => g.EXPL_FORMS.includes(t.form.toLowerCase()) && t.interp.isNounish(),
  ],
  [`flat:name`, `з іменника`, (t) => t.interp.isNounish(), ``, (t) => t],
]

const TREED_SIMPLE_RULES: Array<
  [
    string | Array<string>,
    string,
    TreedSentencePredicateParent,
    string,
    TreedSentencePredicate,
  ]
> = [
  // cc не в сурядний is a separate rule
  [
    `advcl:`,
    `з дієслова/прикметника/прислівника`,
    (t) => g.isFeasibleAdvclHead(t),
    `в присудок`,
    (t) => g.hasPredication(t),
  ],
  [
    `advcl:pred`,
    `з присудка`,
    (t) => canBePredicate(t),
    `в називний/орудний іменник/прикметник`,
    (t) =>
      (t.data.interp.isNominative() || t.data.interp.isInstrumental()) &&
      (t.data.interp.isNoun() || t.data.interp.isAdjective()),
  ],
  [
    `amod`,
    `з іменника`,
    (t) => canActAsNoun(t),
    `в прикметник без предикації`,
    (t) => t.data.interp.isAdjective() && !g.hasPredication(t),
  ],
  [
    `nummod`,
    `з іменника`,
    (t) => canActAsNoun(t),
    `в незайменниковий числівник`,
    (t) => t.data.interp.isCardinalNumeral() && !t.data.interp.isPronominal(),
  ],
  [
    `det:numgov`,
    `з іменника`,
    (t) => canActAsNoun(t),
    `в займенниковий числівник`,
    (t) => t.data.interp.isCardinalNumeral() && t.data.interp.isPronominal(),
  ],
  [
    `advmod:`,
    `див. "неочікуваний advmod"`,
    (t) => t,
    `в прислівник`,
    (t) =>
      t.data.interp.isAdverb() ||
      g.isAdvmodParticle(t) ||
      uEq(t.data.rel, 'fixed'),
  ],
  [
    `advmod:amtgov`,
    `з родового`,
    (t) => t.data.interp.isGenitive(),
    `в числівниковий прислівник`,
    (t) =>
      t.data.interp.isAdverb() &&
      g.QAUNTITATIVE_ADVERBS.includes(t.data.interp.lemma),
  ],
  [
    `advmod:det`,
    `з прикметника"`,
    (t) => t.data.interp.isAdjective(),
    `в DET _такий_/_якийсь_`,
    (t) =>
      toUd(t.data.interp).pos === 'DET' &&
      ['такий', 'такенький', 'якийсь', 'який'].includes(t.data.interp.lemma),
  ],
  [
    `det:`,
    `з іменника`,
    (t) => canActAsNounForObj(t) || t.data.hasTag('adjdet'),
    `в нечислівниковий DET`,
    (t) =>
      toUd(t.data.interp).pos === 'DET' && !t.data.interp.isCardinalNumeral(),
  ],
  [
    `case`,
    `з іменника`,
    (t) =>
      canActAsNounForObj(t) ||
      t.isRoot() || //&& todo: more than 1 root
      (t.data.interp.isAdjective() && t.data.interp.isRelative()) || // todo: generalize
      t.data.interp.isCardinalNumeral() || // todo
      (t.data.interp.isInfinitive() && t.data.hasTag('inf_prep')) ||
      (t.data.interp.isAdjective() && !uEq(t.data.rel, 'amod')) || // temp
      (t.data.interp.isAdverb() &&
        ['тоді', 'нікуди'].includes(t.data.interp.lemma)),
    // && g.PREPS_HEADABLE_BY_NUMS.includes(
    //   t.children.find(x => x.node.rel === 'case').node.interp.lemma)
    `в прийменник`,
    (t) =>
      t.data.interp.isPreposition() ||
      t.children.some((t2) => uEq(t2.data.rel, 'fixed')),
  ],
  [
    `mark`,
    ``,
    (t) => t,
    `в підрядний сполучник`,
    (t) =>
      t.data.interp.isSubordinative() ||
      (t.children.length && t.children.every((x) => uEq(x.data.rel, 'fixed'))),
  ],
  [
    `nsubj:`,
    `з присудка`,
    (t) => canBePredicate(t),
    `в іменникове`,
    (t) => canActAsNounForObj(t),
  ],
  [
    `nsubj:x`,
    `з чистого xcomp’а`,
    (t) => t.data.rel === 'xcomp',
    `в іменникове`,
    (t) => canActAsNounForObj(t),
  ],
  [
    `nsubj:pred`,
    `з :pred’а`,
    (t) => ['xcomp:pred', 'advcl:pred'].includes(t.data.rel),
    `в іменникове`,
    (t) => canActAsNounForObj(t),
  ],
  [
    `csubj`,
    `з присудка чи валентного прикметника`,
    (t) => canBePredicate(t) || g.isValencyHavingAdjective(t.data),
    `в присудок`,
    (t) => canBePredicate(t),
  ],
  [
    `obj`,
    `з присудка чи валентного прикметника`,
    (t) => t.data.interp.isVerbial() || g.isValencyHavingAdjective(t.data),
    `в іменникове`,
    (t) => canActAsNounForObj(t) /* || canTheoreticallyActAsNoun(t) */,
  ],
  [
    `iobj`,
    `з присудка чи валентного прикметника`,
    (t) => canBePredicate(t) || g.isDativeValencyAdjective(t.data),
    `в іменникове`,
    (t) => canActAsNounForObj(t) /* || canTheoreticallyActAsNoun(t) */,
  ],
  [
    `obl`,
    `з дієслова / прикм. / присл. / недієсл. присудка`,
    (t) =>
      t.data.interp.isVerbial2() ||
      t.data.interp.isAdverb() ||
      (t.data.interp.isAdjective() && !t.data.interp.isPronominal()) ||
      g.isNonverbialPredicate(t),
    `в іменник / DET`,
    (t) =>
      canActAsNounForObj(t) ||
      // || t.node.interp.lemma === 'який' && (
      //   g.findRelativeClauseRoot(t) || t.parent.node.rel === 'flat:sibl'
      // )
      (t.data.interp.isAdjective() && t.data.interp.isPronominal()) ||
      // && g.hasChild(t, 'flat:abs')
      1, // temp, todo
  ],
  [
    `nmod`,
    `з іменника`,
    (t) => canActAsNoun(t) || g.isDenUDen(t) /* temp */,
    `в іменник`,
    (t) =>
      canActAsNounForObj(t) ||
      (t.data.interp.lemma === 'який' && g.findRelativeClauseRoot(t)) ||
      g.isDenUDen(t.parent) || // temp
      canTheoreticallyActAsNoun(t),
  ],
  [
    `aux`,
    `з дієслівного`,
    (t) =>
      t.data.interp.isVerbial2() ||
      (t.data.interp.isAdverb() &&
        t.children.some((x) =>
          g.SUBJECTS.some((subj) => uEq(x.data.rel, subj)),
        )),
    `у ${g.AUX_LEMMAS.join('|')}`,
    (t) => g.AUX_LEMMAS.includes(t.data.interp.lemma),
  ],
  [
    `acl`,
    `з іменника`,
    (t) =>
      canActAsNoun(t) ||
      (!uEq(t.data.rel, 'det') &&
        [
          f.PronominalType.demonstrative,
          f.PronominalType.general,
          f.PronominalType.indefinite,
        ].includes(t.data.interp.getFeature(f.PronominalType))),
    `в присудок/інфінітив/:relless/:adv`,
    (t) =>
      g.hasPredication(t) ||
      t.data.interp.isInfinitive() ||
      t.data.rel === 'acl:relless' || // todo: comprehend
      t.data.rel === 'acl:adv',
  ],
  [
    `acl:adv`,
    `з іменника`,
    (t) =>
      canActAsNoun(t) ||
      (!uEq(t.data.rel, 'det') &&
        [
          f.PronominalType.demonstrative,
          f.PronominalType.general,
          f.PronominalType.indefinite,
        ].includes(t.data.interp.getFeature(f.PronominalType))),
    `в одинокий (діє)прислівник`,
    (t) =>
      (t.data.interp.isAdverb() || t.data.interp.isConverb()) &&
      !t.hasChildren(),
  ],
  [
    `punct`,
    `зі слова`,
    (t) =>
      !t ||
      !t.data.interp.isPunctuation() ||
      t.data.hasTag('nestedpunct') ||
      g.isPunctInParentheses(t),
    // t => !t /*temp*/ /*|| isContentWord(t)*/ || t.tags.includes('nestedpunct'),
    `в PUNCT`,
    (t) => t.data.interp.isPunctuation(),
  ],
  [
    `flat:foreign`,
    `з :foreign`,
    (t) => t.data.interp.isForeign(),
    `у :foreign`,
    (t) => t.data.interp.isForeign(),
  ],
  [
    `xcomp:`,
    `з присудка / валентного прикметника`,
    (t) => canBePredicate(t) || g.isInfValencyAdjective(t.data),
    `в інфінітив - присудок`,
    (t) =>
      (g.isInfinitiveAnalytically(t) || g.hasInfinitiveCop(t)) &&
      canBePredicate(t),
  ],
  [
    `ccomp`,
    `з присудка / валентного прикметника`,
    (t) =>
      canBePredicate(t) ||
      (g.isInfinitiveAnalytically(t) && g.isInfValencyAdjective(t.data)) ||
      g.isValencyHavingAdjective(t.data),
    `в присудок (тест: фінітний)`,
    (t) => canBePredicate(t),
  ],
  [
    `xcomp:pred`,
    `з присудка`,
    (t) => canBePredicate(t),
    `в називний/орудний іменник/прикметник чи в „як щось“`,
    (t) =>
      ((t.data.interp.isNominative() || t.data.interp.isInstrumental()) &&
        (t.data.interp.isNoun() || t.data.interp.isAdjective())) ||
      g.canBeAsSomethingForXcomp2(t) ||
      t.data.isGraft,
  ],
  [
    `vocative:`,
    `з присудка`,
    (t) => canBePredicate(t),
    `в кличний іменник`,
    (t) =>
      t.data.interp.isXForeign() ||
      t.data.interp.isForeign() ||
      (canActAsNoun(t) &&
        (t.data.interp.isVocative() || t.data.hasTag('nomvoc'))),
  ],
  [
    `vocative:cl`,
    `з присудка`,
    (t) => canBePredicate(t),
    `в присудок`,
    (t) => canBePredicate(t),
  ],
  [
    `appos:`,
    `з іменника`,
    (t) => canActAsNoun(t),
    `в іменник`,
    (t) => canActAsNoun(t),
  ],
  [`dislocated`, `~з присудка`, (t) => canBePredicate(t), ``, (t) => t],
]

interface ReoprtIf2Arg {
  n: GraphNode<Token> // tree node
  t: Token // token
  i: MorphInterp // interp
  l: string // lemma
  r: string // relation
  c: Array<GraphNode<Token>> // children
  p: GraphNode<Token>
  pt: Token
  pi: MorphInterp
  pl: string
  pr: string
}

type SentencePredicate = (x: Token, i?: number) => any
type SentencePredicate2 = (
  t: Token,
  s: Array<Token>,
  i: number /*, node: GraphNode<Token>*/,
) => any
type TreedSentencePredicate = (t: GraphNode<Token>) => any
type EnhancedArrowPredicate = (arrow: EnhancedArrow) => any
type TreedSentencePredicateParent = (
  parent: GraphNode<Token>,
  child?: GraphNode<Token>,
) => any
type TreedSentencePredicate2 = (a: ReoprtIf2Arg) => any

export interface Problem {
  message: string
  indexes: Array<number>
}

export function validateSentenceSyntax(
  nodes: Array<GraphNode<Token>>,
  multitokens: Array<MultitokenDescriptor>,
  enhancedOnlyNodes: Array<EnhancedNode>,
  enhancedNodes: Array<EnhancedNode>,
  analyzer: MorphAnalyzer,
  corefClusterization: SimpleGrouping<Token>,
  valencyDict?: ValencyDict,
) {
  let problems = new Array<Problem>()

  let tokens = nodes.map((x) => x.data)
  let roots = nodes.filter((x) => x.isRoot())
  let basicRoots = roots.filter((x) => !x.data.isElided())
  let sentenceHasOneRoot = roots.length === 1
  let node2index = new Map(
    nodes.map((x, i) => [x, i] as [GraphNode<Token>, number]),
  )

  const oldReportIf = (message: string, fn: SentencePredicate) => {
    problems.push(
      ...mu(tokens)
        .findAllIndexes(fn)
        .map((index) => ({ message, indexes: [index] })),
    )
  }

  const reportIf = (message: string, fn: TreedSentencePredicate) => {
    problems.push(
      ...mu(nodes)
        .findAllIndexes(fn)
        .map((index) => ({ message, indexes: [index] })),
    )
  }

  const ereportIf = (message: string, fn: EnhancedArrowPredicate) => {
    problems.push(
      ...mu(enhancedNodes)
        .findAllIndexes((enode) => enode.incomingArrows.some(fn))
        .map((index) => ({ message, indexes: [index] })),
    )
  }

  const reportIf2 = (message: string, fn: TreedSentencePredicate2) => {
    problems.push(
      ...mu(nodes)
        .map((x) => ({
          n: x,
          t: x.data,
          r: x.data.rel,
          i: x.data.interp,
          l: x.data.interp.lemma,
          c: x.children,
          p: x.parent,
          pi: x.parent && x.parent.data.interp,
          pt: x.parent && x.parent.data,
          pl: x.parent && x.parent.data.interp.lemma,
          pr: x.parent && x.parent.data.rel,
        }))
        .findAllIndexes(fn)
        .map((index) => ({ message, indexes: [index] })),
    )
  }

  const xreportIf = (message: string, fn: TreedSentencePredicate) => undefined
  const xreportIf2 = (message: string, fn: TreedSentencePredicate2) => undefined
  const xoldReportIf = (message: string, fn: SentencePredicate) => undefined

  const tmpxreportIf = (message: string, fn: TreedSentencePredicate) =>
    undefined
  const tmpxreportIf2 = (message: string, fn: TreedSentencePredicate2) =>
    undefined

  const hasDependantWhich = (i: number, fn: SentencePredicate) =>
    tokens.some((xx, ii) => xx.headIndex === i && fn(xx, ii))

  // ~~~~~~~ rules ~~~~~~~~

  // invalid roots
  if (sentenceHasOneRoot && !roots[0].data.hasTag('ok-root')) {
    let udPos = toUd(roots[0].data.interp).pos
    if (g.POSES_NEVER_ROOT.includes(udPos)) {
      problems.push({
        indexes: [node2index.get(roots[0])],
        message: `${udPos} як корінь`,
      })
    }
  }

  if (0) {
    let interesting = tokens.filter(
      (x) =>
        ['один', 'другий'].includes(x.interp.lemma) && x.rel !== 'flat:abs',
    )
    if (interesting.length > 1) {
      problems.push({
        indexes: interesting.map((x) => x.index),
        message: `flat:abs?`,
      })
    }
  }

  // invalid AUX
  reportIf(`AUX без cop/aux`, PREDICATES.isAuxWithNoCopAux)

  // simple rules
  for (let [
    rel,
    messageFrom,
    predicateFrom,
    messageTo,
    predicateTo,
  ] of SIMPLE_RULES) {
    let relMatcher = rel.endsWith(':')
      ? (x: string) => x === rel.slice(0, -1)
      : (x: string) => x === rel || (x && x.startsWith(`${rel}:`))

    let relName = rel.endsWith(':') ? `${rel.slice(0, -1)}` : rel

    if (messageFrom && predicateFrom) {
      oldReportIf(
        `${relName} не ${messageFrom}`,
        (t) =>
          relMatcher(t.rel) &&
          !tokens[t.headIndex].interp0().isXForeign() &&
          !predicateFrom(tokens[t.headIndex], tokens, t.headIndex),
      )
    }

    if (messageTo && predicateTo) {
      oldReportIf(
        `${relName} не ${messageTo}`,
        (t, i) =>
          relMatcher(t.rel) &&
          !t.interp0().isXForeign() &&
          !predicateTo(t, tokens, i),
      )
    }
  }

  // treed simple rules
  for (let [
    rels,
    messageFrom,
    predicateFrom,
    messageTo,
    predicateTo,
  ] of TREED_SIMPLE_RULES) {
    rels = arrayed(rels)
    for (let rel of rels) {
      let relMatcher = rel[0].endsWith(':')
        ? (x: string) => x === rel.slice(0, -1)
        : (x: string) => x === rel || (x && x.startsWith(`${rel}:`))

      let relName = rel.endsWith(':') ? `${rel.slice(0, -1)}` : rel

      if (messageFrom && predicateFrom) {
        reportIf(
          `${relName} не ${messageFrom}`,
          (t) => relMatcher(t.data.rel) && !predicateFrom(t.parent),
        )
      }
      if (messageTo && predicateTo) {
        reportIf(
          `${relName} не ${messageTo}`,
          (t) => relMatcher(t.data.rel) && !predicateTo(t),
        )
      }
    }
  }

  // ~~~~~~~~~~~~~~~~~~~~~~ TESTS ~~~~~~~~~~~~~~~~~~~~~~

  xreportIf2(
    `_тест: числівники`,
    ({ t, i }) =>
      t.index < tokens.length - 1 &&
      i.isCardinalNumerish() &&
      (t.index === 0 || !tokens[t.index - 1].interp.isCardinalNumerish()) &&
      (tokens[t.index + 1].interp.isCardinalNumerish() ||
        t.interp.isNounNumeral()),
  )

  xreportIf2(
    `_тест: складений порядковий`,
    ({ t, i }) =>
      t.index > 0 &&
      i.isOrdinalNumeral() &&
      tokens[t.index - 1].interp.isCardinalNumerish(),
    // && (t.indexInSentence === 0
    //   || !sentence[t.indexInSentence - 1].interp.isCardinalNumerish())
    // && (sentence[t.indexInSentence + 1].interp.isCardinalNumerish()
    //   || t.interp.isNounNumeral())
  )

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  reportIf(
    `декілька підметів (${g.SUBJECTS.join('|')})`,
    (t) =>
      t.children.filter(
        (x) => uEqSome(x.data.rel, g.SUBJECTS) && !x.data.isElided(),
      ).length > 1,
  )
  reportIf(
    `декілька прямих додатків`,
    (t) =>
      t.children.filter(
        (x) => !x.data.isElided() && uEqSome(x.data.rel, g.CORE_COMPLEMENTS),
        // || uEq(x.node.rel, 'xcomp') && x.node.rel !== 'xcomp:pred'
      ).length > 1,
  )
  reportIf(
    `декілька непрямих додатків`,
    (t) => t.children.filter((x) => uEq(x.data.rel, 'iobj')).length > 1,
  )
  reportIf(
    `декілька числівників`,
    (t) => t.children.filter((x) => isNumericModifier(x.data.rel)).length > 1,
  )
  reportIf(
    `декілька gov-реляцій`,
    (t) => t.children.filter((x) => isGoverning(x.data.rel)).length > 1,
  )
  reportIf(
    `декілька cc`,
    (t) =>
      !t.data.hasTag('mult-cc') &&
      t.children.filter((x) => uEq(x.data.rel, 'cc')).length > 1,
  )
  reportIf(
    `декілька mark’ів`,
    (t) => t.children.filter((x) => uEq(x.data.rel, 'mark')).length > 1,
  )
  reportIf(
    `декілька xcomp’ів`,
    (t) =>
      t.children.filter(
        (x) => uEq(x.data.rel, 'xcomp') && x.data.rel !== 'xcomp:pred',
      ).length > 1,
  )
  reportIf(
    `декілька xcomp:pred`,
    (t) => t.children.filter((x) => x.data.rel === 'xcomp:pred').length > 1,
  )
  reportIf(
    `декілька cop’ів`,
    (t) => t.children.filter((x) => uEq(x.data.rel, 'cop')).length > 1,
  )
  reportIf(
    `декілька прийменників`,
    (t) =>
      !t.data.isGraft &&
      t.children.filter((x) => uEq(x.data.rel, 'case')).length > 1,
  )

  oldReportIf(`токен позначено error’ом`, (t) => t.hasTag('error'))

  reportIf(
    'більше однієї стрілки в токен',
    (t) =>
      mu(t.data.deps)
        .filter(
          (x) =>
            !uEq(x.relation, 'punct') &&
            !g.HELPER_RELATIONS.has(x.relation) &&
            !tokens[x.headIndex].isElided(), // todo
        )
        .count() > 1,
  )

  g.RIGHT_POINTED_RELATIONS.forEach((rel) =>
    reportIf2(
      `${rel} ліворуч`,
      ({ r, t }) => uEq(r, rel) && t.headIndex > t.index,
    ),
  )
  g.LEFT_POINTED_RELATIONS.forEach((rel) =>
    reportIf2(
      `${rel} праворуч`,
      ({ r, t }) => uEq(r, rel) && t.headIndex < t.index,
    ),
  )

  oldReportIf(
    `case праворуч`,
    (t, i) =>
      uEq(t.rel, 'case') &&
      t.headIndex < i &&
      !(tokens[i + 1] && tokens[i + 1].interp.isNumeric()),
  )

  oldReportIf(
    'незнана реляція',
    (t) => t.rel && !g.ALLOWED_RELATIONS.includes(t.rel as UdMiRelation),
  )

  reportIf(
    `cc не в сурядний`,
    (t) =>
      uEq(t.data.rel, 'cc') &&
      !t.data.interp.isCoordinating() &&
      !g.hasChild(t, 'fixed'),
  )

  reportIf(
    `punct в двокрапку зліва`,
    (t) =>
      t.data.index !== tokens.length - 1 && // not last in sentence
      t.data.form === ':' &&
      t.data.interp.isPunctuation() &&
      t.data.headIndex < t.data.index &&
      !(
        t.parent &&
        (uEqSome(t.parent.data.rel, ['discourse']) ||
          t.parent.data.rel === 'parataxis:discourse')
      ),
  )

  xoldReportIf(
    `у залежника ccomp немає підмета`,
    (t, i) =>
      t.rel === 'ccomp' &&
      !tokens.some((xx) => g.SUBJECTS.includes(xx.rel) && xx.headIndex === i),
  )

  reportIf(
    `у залежника xcomp є підмет`,
    (t) =>
      uEq(t.data.rel, 'xcomp') &&
      !t.data.isGraft &&
      t.children.some((x) => uEqSome(x.data.rel, g.SUBJECTS)),
  )

  oldReportIf(
    'не discourse до частки',
    (t) =>
      t.rel &&
      !['б', 'би', 'не'].includes(t.form.toLowerCase()) &&
      t.interp.isParticle() &&
      !['discourse', 'fixed'],
  )

  reportIf(
    'не aux у б(и)',
    (t) =>
      !t.isRoot() &&
      g.CONDITIONAL_AUX_LEMMAS.includes(t.data.form.toLowerCase()) &&
      t.data.interp.isParticle() &&
      !uEqSome(t.data.rel, [/* 'fixed', */ 'aux', 'goeswith']),
  )

  reportIf(
    'не advmod в не',
    (t) =>
      t.data.interp.isParticle() &&
      !g.hasChild(t, 'fixed') &&
      ['не' /*'ні', 'лише'*/].includes(t.data.form.toLowerCase()) &&
      !['advmod', undefined].includes(t.data.rel),
  )

  oldReportIf(
    'не cc в сурядий на початку речення',
    (t, i) =>
      t.rel && i === 0 && t.interp.isCoordinating() && !['cc'].includes(t.rel),
  )

  for (let leafrel of g.LEAF_RELATIONS) {
    reportIf(
      `${leafrel} має залежників`,
      (t) =>
        uEq(t.data.rel, leafrel) &&
        !t.children.every((x) => x.data.interp.isPunctuation()),
    )
  }

  reportIf(
    `сполучник виділено розділовим знаком`,
    (t) =>
      t.data.interp.isConjunction() &&
      t.children.some((ch) => ch.data.rel === 'punct') &&
      !t.isRoot() &&
      !uEq(t.data.rel, 'conj') &&
      !t.data.hasTag('commed_conj'),
  )

  reportIf(
    `підмет не в називному`,
    (t) =>
      uEq(t.data.rel, 'nsubj') &&
      !t.data.isGraft &&
      !t.data.hasTag('ok-nonnom-subj') &&
      ![f.Case.nominative, undefined].includes(g.thisOrGovernedCase(t)) &&
      !t.data.interp.isForeign() &&
      !g.isQuantificationalNsubj(t) &&
      !g.isQuantitativeAdverbModified(t) &&
      !t.children.some(
        (x) =>
          g.isNumericModifier(x.data.rel) &&
          x.children.some(
            (xx) =>
              xx.data.interp.isPreposition() &&
              ['близько', 'до', 'понад'].includes(xx.data.interp.lemma),
          ),
      ),
  )

  reportIf(`день у день`, (t) => g.isDenUDen(t))

  tmpxreportIf(
    `займенник :&noun`,
    (t) => t.data.interp.isAdjectiveAsNoun() && t.data.interp.isPronominal(),
  )

  reportIf(
    `додаток в називному`,
    (t) =>
      uEqSome(t.data.rel, ['obj', 'iobj', 'obl']) &&
      g.thisOrGovernedCase(t) === f.Case.nominative &&
      !t.data.interp.isXForeign() &&
      !t.data.isGraft &&
      t.parent.data.interp.isReversive() &&
      !t.children.some((x) => x.data.rel === 'flat:abs') &&
      !(uEqSome(t.data.rel, ['obl']) && ['сам'].includes(t.data.interp.lemma)),
  )

  reportIf(`місцевий без прийменника`, (t) => {
    if (
      !t.data.rel ||
      uEq(t.data.rel, 'fixed') ||
      !t.data.interp.isLocative() ||
      !canActAsNoun(t)
    ) {
      return
    }
    let p = t
    while (p && !hasChildrenOfUrel(p, 'case')) {
      if (!uEqSome(p.data.rel, ['appos', 'conj', 'flat'])) {
        return true
      }
      p = p.parent
    }
  })

  reportIf(
    `підрядне означальне відкриває що-іменник`,
    (t) =>
      uEq(t.data.rel, 'acl') &&
      t.children.some(
        (x) =>
          x.data.form.toLowerCase() === 'що' && uEqSome(x.data.rel, ['nsubj']),
      ),
  )

  reportIf(
    `cc без conj`,
    (t) =>
      uEq(t.data.rel, 'cc') &&
      !t.parent.isRoot() &&
      !uEqSome(t.parent.data.rel, [
        'conj',
        'flat:title',
        'flat:repeat',
        'parataxis:newsent',
      ]) &&
      !t.parent.children.some((x) => uEq(x.data.rel, 'conj')),
  )

  // todo
  xreportIf(
    `підрядне без сполучника`,
    (t) =>
      uEqSome(t.data.rel, g.SUBORDINATE_CLAUSES) &&
      !uEq(t.data.rel, 'xcomp') &&
      // && !t.parent.children[0].node.interp.isConsequential()
      !t.children.some((x) => uEq(x.data.rel, 'mark')) &&
      !g.hasOwnRelative(t) &&
      // && !t.children.some(x => x.node.interp.isRelative())
      // && !g.isInfinitive(t)
      !(uEq(t.data.rel, 'acl') && t.data.interp.isParticiple()) &&
      !(uEq(t.data.rel, 'advcl') && t.data.interp.isConverb()) &&
      !t.data.rel.endsWith(':pred'),
  )

  xreportIf(
    `зворотне має два додатки`,
    (t) =>
      t.data.interp.isReversive() &&
      t.children.filter(
        (x) =>
          uEqSome(x.data.rel, ['obj', 'iobj', 'ccomp']) && !x.data.isElided(),
      ).length > 1,
  )

  reportIf(
    `неузгодження відмінків прийменника`, // todo: додати conj
    (t) =>
      uEq(t.data.rel, 'case') &&
      (t.data.interp.features.requiredCase as number) !==
        g.thisOrGovernedCase(t.parent) &&
      !t.parent.data.interp.isXForeign() &&
      !t.parent.data.interp.isForeign() && // todo
      !t.parent.data.isGraft &&
      //   &&!t.children.some(x => uEq(x.node.rel, 'case')
      //   && x.node.interp.getFeature(f.RequiredCase)===
      // )
      !g.hasChild(t.parent, 'fixed') &&
      !(
        t.data.interp.lemma === 'замість' &&
        t.parent.data.interp.isVerb() &&
        t.parent.data.interp.isInfinitive()
      ) &&
      !(
        t.parent.data.interp.isAdverb() &&
        ['нікуди'].includes(t.parent.data.interp.lemma)
      ),
  )

  reportIf(
    `неособове має підмет`,
    (t) =>
      (t.data.interp.isImpersonal() || g.isInfinitive(t)) &&
      t.children.some((x) => uEqSome(x.data.rel, g.SUBJECTS)),
  )

  reportIf(
    `знахідний без прийменника від недієслова`,
    (t) =>
      canActAsNounForObj(t) &&
      !t.isRoot() &&
      t.data.interp.isAccusative() &&
      !t.parent.data.interp.isAccusative() &&
      !t.parent.data.isGraft &&
      !t.children.some((x) => x.data.interp.isPreposition()) &&
      !t.parent.data.interp.isVerbial2() &&
      !uEqSome(t.data.rel, ['conj', 'flat', 'appos', 'orphan', 'fixed']), // todo
    // && !thisOrTravelUp(t, tt =>
    //   tt.parent.node.interp.isVerbial()
    //   && tt.children.some(x => x.node.interp.isPreposition())
    // )
    // && !t.parent.node.interp.isVerbial()
  )

  if (roots.length === 1) {
    xreportIf(`інфінітив — корінь`, (t) => t.isRoot() && g.isInfinitive(t))
  }

  reportIf2(
    `aux-інфінітив з дієслова-інфінітива`,
    ({ r, i, pi }) => uEq(r, 'aux') && i.isInfinitive() && pi.isInfinitive(),
  )

  xreportIf(
    `неузгодження в часі`,
    (t) =>
      uEq(t.data.rel, 'aux') &&
      t.data.interp.isVerb() &&
      (t.data.interp.hasFeature(f.Tense) ||
        t.parent.data.interp.hasFeature(f.Tense)) &&
      !t.parent.data.interp.isInfinitive() &&
      t.data.interp.getFeature(f.Tense) !==
        t.parent.data.interp.getFeature(f.Tense) &&
      !t.parent.data.interp.isImpersonal(),
  )

  xreportIf(
    `ні допоміжне, ані повнозначне дієслово не має часу`,
    (t) =>
      uEq(t.data.rel, 'aux') &&
      t.data.interp.isVerb() &&
      (t.data.interp.isInfinitive() || !t.data.interp.hasFeature(f.Tense)) &&
      (t.parent.data.interp.isInfinitive() ||
        !t.parent.data.interp.getFeature(f.Tense)),
  )

  reportIf(
    `неузгодження підмет — прикметник-присудок`,
    (t) =>
      uEq(t.data.rel, 'nsubj') &&
      t.parent.data.interp.isAdjective() &&
      !t.parent.data.isPromoted &&
      !g.nounAdjectiveAgreed(t, t.parent) &&
      !(t.parent.data.interp.isInstrumental() && g.hasCopula(t.parent)),
  )

  xreportIf(
    `неочікуваний відмінок іменника-присудка`,
    (t) =>
      uEq(t.data.rel, 'nsubj') &&
      t.parent.data.interp.isNounish() &&
      // && !g.nounNounAgreed(t.node.interp, t.parent.node.interp)
      !t.parent.data.interp.isNominative() &&
      !g.hasChild(t.parent, 'case') &&
      !(t.parent.data.interp.isInstrumental() && g.hasCopula(t.parent)),
    // && !['це'].some(x => t.node.interp.lemma === x)
  )

  xreportIf(
    `неузгодження прикладки`, // todo: mark explicitly in tb
    (t) =>
      uEq(t.data.rel, 'appos') &&
      t.data.interp.isNounish() &&
      t.parent.data.interp.isNounish() &&
      !t.data.interp.isXForeign() &&
      g.thisOrGovernedCase(t) !== g.thisOrGovernedCase(t.parent) &&
      // && !g.nounNounAgreed(t.node.interp, t.parent.node.interp)
      // && !t.node.interp.equalsByFeatures(t.parent.node.interp, [f.Case/* , f.MorphNumber */])
      // && ![[t, t.parent], [t.parent, t]].some(([a, b]) =>
      //   g.hasChild(a, 'conj')
      //   && a.node.interp.isSingular()
      //   && b.node.interp.isPlural()
      // )
      !g.hasChild(t, 'mark') &&
      !t.children.some(
        (x) => x.data.interp.lemma === '(' && x.data.interp.isPunctuation(),
      ),
    // && !(t.children.length
    //   && t.children[0].node.interp.lemma === '('
    //   && !t.children[0].node.interp.isPunctuation())
    // (
  )

  reportIf(
    `неузгодження відмінків однорідних іменників`,
    (t) =>
      uEq(t.data.rel, 'conj') &&
      !t.data.interp.equalsByFeatures(t.parent.data.interp, [
        f.Case /* , f.MorphNumber */,
      ]) &&
      t.data.rel !== 'conj:parataxis' &&
      !uEqSome(t.parent.data.rel, ['obl']) &&
      t.data.interp.isNounish() &&
      t.parent.data.interp.isNounish() &&
      !t.data.interp.isXForeign() &&
      g.thisOrGovernedCase(t) !== g.thisOrGovernedCase(t.parent) &&
      !g.isQuantitativeAdverbModified(t) &&
      // && !g.isQuantitativeAdverbModified(t.parent)
      !(uEqSome(t.parent.data.rel, ['nmod']) && g.hasChild(t, 'case')),
  )

  reportIf(
    `неузгодження однорідних прикметників`,
    (t) =>
      uEq(t.data.rel, 'conj') &&
      t.data.rel !== 'conj:parataxis' &&
      // && !uEqSome(t.parent.node.rel, ['obl'])
      t.data.interp.isAdjective() &&
      t.parent.data.interp.isAdjective() &&
      !t.parent.data.interp.equalsByFeatures(t.data.interp, [
        f.Case /* , f.MorphNumber */,
      ]),
  )

  xreportIf(
    `неузгодження однорідних дієслів`,
    (t) =>
      uEq(t.data.rel, 'conj') &&
      t.data.rel !== 'conj:parataxis' &&
      // && !uEqSome(t.parent.node.rel, ['obl'])
      t.data.interp.isVerbial() &&
      t.parent.data.interp.isVerbial() &&
      !t.parent.data.interp.equalsByFeatures(t.data.interp, [
        f.Tense,
        f.Person,
        f.MorphNumber,
      ]) &&
      !g.hasChild(t, 'nsubj'),
  )

  reportIf(
    `неузгодження підмет — присудок-дієслово`,
    (t) =>
      uEq(t.data.rel, 'nsubj') &&
      t.parent.data.interp.isVerb() &&
      !g.nsubjAgreesWithPredicate(t, t.parent),
  )

  xreportIf(`неузгодження підмет-присудок`, (t) => {
    if (
      t.isRoot() ||
      t.data.hasTag('graft') ||
      !uEq(t.data.rel, 'nsubj') ||
      !t.parent.data.interp.isVerbial2() ||
      t.parent.data.interp.isImpersonal() ||
      t.data.interp.isXForeign()
    ) {
      return false
    }

    let { interp } = t.data
    let subjFeats = t.data.interp.features

    let verbInterp = t.parent.data.interp
    if (verbInterp.isInfinitive()) {
      let aux = t.parent.children.find((x) => uEqSome(x.data.rel, ['aux']))
      if (aux) {
        verbInterp = aux.data.interp
      } else {
      }
    }

    if (
      verbInterp.hasPerson() &&
      // todo: losen
      !(
        interp.isPronominal() &&
        !interp.isPersonal() &&
        !interp.hasFeature(f.Person)
      )
    ) {
      let subjPerson = subjFeats.person || f.Person.third
      if (subjPerson !== verbInterp.features.person) {
        return true
      }
    }

    if (
      verbInterp.hasGender() &&
      !(interp.isForeign() && !interp.hasGender()) &&
      !t.data.hasTag('gendisagr') &&
      !interp.isPlural() &&
      // && !(t.node.interp.isPronoun()
      //   && subjFeats.person === Person.first || subjFeats.person === Person.second)
      !(
        interp.isPronominal() && g.GENDERLESS_PRONOUNS.includes(interp.lemma)
      ) &&
      verbInterp.getFeature(f.Gender) !== interp.getFeature(f.Gender) &&
      !g.isNegativeExistentialPseudosubject(t) &&
      !interp.isNoun() &&
      interp.lemma === 'це'
    ) {
      // return true
    }

    if (
      !t.children.some((x) => uEq(x.data.rel, 'conj')) &&
      !g.hasNmodConj(t) &&
      !t.data.hasTag('numdisagr') &&
      !(t.data.interp.isPronominal() && !t.data.interp.hasNumber()) &&
      verbInterp.getFeature(f.MorphNumber) !==
        interp.getFeature(f.MorphNumber) &&
      !(g.isNumeralModified(t) /*  && interp.isGenitive() */) &&
      !verbInterp.isInstant()
    ) {
      return true
    }
  })

  reportIf(`неузгодження іменник-прикметник`, (t) => {
    if (t.isRoot()) {
      return
    }
    let { interp } = t.data
    let nounInterp = t.parent.data.interp

    let ret =
      uEqSome(t.data.rel, ['amod', 'det']) ||
      (uEqSome(t.data.rel, ['acl']) && nounInterp.isParticiple())
    ret =
      ret &&
      interp.isAdjective() &&
      !interp.isMock() &&
      !t.parent.data.isGraft &&
      !nounInterp.isXForeign() &&
      ((interp.hasGender() &&
        interp.features.gender !== nounInterp.features.gender &&
        // && !t.parent.node.isPromoted
        !g.GENDERLESS_PRONOUNS.includes(nounInterp.lemma) &&
        !(interp.isOrdinalNumeral() && nounInterp.lemma === 'рр.')) ||
        (interp.features.case !== nounInterp.features.case &&
          interp.features.case !== g.thisOrGovernedCase(t.parent))) &&
      // виділяють три основних елементи
      !(
        interp.isGenitive() &&
        [f.Case.accusative, f.Case.nominative].includes(
          t.parent.data.interp.getFeature(f.Case),
        ) &&
        t.parent.children.some((x) => x.data.rel === 'nummod')
      )

    return ret
  })

  reportIf2(
    `неузгодження родів іменника-числівника`,
    ({ r, i, pi }) =>
      uEq(r, 'nummod') &&
      i.hasFeature(f.Gender) &&
      i.getFeature(f.Gender) !== pi.getFeature(f.Gender) &&
      !pi.isXForeign(),
  )

  reportIf(
    `неузгодження істотовості`,
    (t) =>
      uEqSome(t.data.rel, ['amod', 'det', 'nummod']) &&
      t.data.interp.hasFeature(f.RequiredAnimacy) &&
      t.parent.data.interp.hasFeature(f.Animacy) &&
      (t.data.interp.features.requiredAnimacy as number) !==
        t.parent.data.interp.features.animacy &&
      (t.data.interp.features.requiredAnimacy as number) !==
        t.parent.data.interp.features.grammaticalAnimacy,
    // todo: or ranim for promoted adj
  )

  reportIf(
    `неузгодження flat:name`,
    (t) =>
      t.data.rel === 'flat:name' &&
      !g.nounNounAgreed(t.parent.data.interp, t.data.interp),
  )

  reportIf(
    `неузгодження flat:title`,
    (t) =>
      t.data.rel === 'flat:title' &&
      // && !g.nounNounAgreed(t.parent.node.interp, t.node.interp)
      !t.parent.data.interp.equalsByFeatures(t.data.interp, [
        /* f.MorphNumber, */ /* f.Gender, */ f.Case,
      ]) &&
      g.thisOrGovernedCase(t) !== f.Case.nominative &&
      !t.data.interp.isForeign() &&
      !t.data.interp.isSymbol() &&
      !t.data.isGraft &&
      !isEncolsedInQuotes(t),
  )

  xreportIf(`неузгодження однорідних`, (t) => {
    if (!uEq(t.data.rel, 'conj') || t.data.rel === 'conj:parataxis') {
      return
    }

    if (
      t.data.interp.isNounish() &&
      !t.parent.data.interp.equalsByFeatures(t.data.interp, [f.Case])
    ) {
      // return true
    }

    if (
      t.data.interp.isVerb() &&
      !t.parent.data.interp.equalsByFeatures(t.data.interp, [
        f.VerbAuxilarity,
        f.VerbType,
        f.Gender,
      ])
    ) {
      // return true
    }

    if (
      t.data.interp.isAdjective() &&
      !t.parent.data.interp.equalsByFeatures(t.data.interp, [f.Case, f.Gender])
    ) {
      return true
    }
  })

  reportIf(
    `gov-реляція між однаковими відмінками`,
    (t) =>
      isGoverning(t.data.rel) &&
      t.data.interp.features.case === t.parent.data.interp.features.case,
  )

  reportIf(
    `не gov-реляція між різними відмінками`,
    (t) =>
      !isGoverning(t.data.rel) &&
      ['nummod', 'det:nummod'].some((rel) => uEq(t.data.rel, rel)) &&
      !t.parent.data.interp.isXForeign() &&
      t.data.interp.features.case !== t.parent.data.interp.features.case &&
      !g.canBeDecimalFraction(t), // todo
  )

  reportIf(
    `керівний числівник не в називному/знахідному`,
    (t) =>
      isGoverning(t.data.rel) &&
      t.data.interp.features.case !== t.parent.data.interp.features.case &&
      ![f.Case.nominative, f.Case.accusative].includes(
        t.data.interp.features.case,
      ),
  )

  reportIf(
    `множинний числівник керує одниною`,
    (t) =>
      uEqSome(t.data.rel, ['nummod', 'det:nummod', 'det:numgov']) &&
      !t.parent.data.interp.isPlural() &&
      !t.data.interp.lemma.endsWith('1') &&
      !['один', 'півтора', 'пів'].includes(t.data.interp.lemma) &&
      !g.canBeDecimalFraction(t) &&
      !t.parent.data.interp.isXForeign(),
  )

  reportIf(`кероване числівником не в родовому`, (t) => {
    let governer = t.children.find((x) => isGoverning(x.data.rel))
    if (!governer) {
      return
    }

    return (
      t.data.interp.features.case !== governer.data.interp.features.case &&
      !t.data.interp.isGenitive()
    )
  })

  reportIf(
    `mark не з кореня підрядного`,
    (t) =>
      uEq(t.data.rel, 'mark') &&
      // && !t.parent.isRoot()
      ((sentenceHasOneRoot && !t.parent.data.rel) ||
        (t.parent.data.rel &&
          !uEqSome(t.parent.data.rel, g.MARK_ROOT_RELS) &&
          !(
            uEq(t.parent.data.rel, 'conj') &&
            g.SUBORDINATE_CLAUSES.some((x) => uEq(t.parent.parent.data.rel, x))
          ))) &&
      !(
        t.parent.isRoot() &&
        t.data.index ===
          nodes.findIndex(
            (x) =>
              !x.data.interp.isPunctuation() &&
              !mu(x.walkThisAndUp0()).some((xx) =>
                uEqSome(xx.data.rel, ['discourse']),
              ),
          )
      ) &&
      // використання як енергетичної сировини
      !(
        t.parent.data.rel === 'nmod:xcompsp' &&
        ['як'].includes(t.data.interp.lemma)
      ),
  )

  reportIf(
    `parataxis під’єднано сполучником`,
    (t) =>
      uEq(t.data.rel, 'parataxis') &&
      t.data.rel !== 'parataxis:discourse' &&
      t.data.rel !== 'parataxis:thatis' &&
      t.data.rel !== 'parataxis:rel' &&
      t.data.rel !== 'parataxis:newsent' &&
      t.children.some((x) => uEqSome(x.data.rel, ['cc', 'mark'])) &&
      !t.children.some(
        (x) => x.data.interp.isQuote() && x.data.interp.isOpening(),
      ),
  )

  reportIf(
    `parataxis має відносний`,
    (t) =>
      uEq(t.data.rel, 'parataxis') &&
      t.data.rel !== 'parataxis:rel' &&
      t.data.rel !== 'parataxis:discourse' &&
      g.hasOwnRelative(t),
  )

  reportIf(
    `parataxis:rel не має відносного`,
    (t) => t.data.rel === 'parataxis:rel' && !g.hasOwnRelative(t),
  )

  reportIf(
    `xcomp зі сполучником`,
    (t) =>
      uEq(t.data.rel, 'xcomp') &&
      // && t.node.rel !== 'parataxis:discourse'
      t.children.some((x) => uEqSome(x.data.rel, [/* 'cc',  */ 'mark'])) &&
      !g.canBeAsSomethingForXcomp2(t) &&
      !t.data.hasTag('xcomp_mark'),
  )

  reportIf(
    `flat:name не для імені`,
    (t) =>
      (t.data.rel === 'flat:name' ||
        t.children.some((x) => x.data.rel === 'flat:name')) &&
      !t.data.interp.isName(),
  )

  reportIf(
    `підрядне речення з _то_`,
    (t) =>
      t.data.interp.lemma === 'то' &&
      t.parent &&
      uEqSome(t.parent.data.rel, g.SUBORDINATE_CLAUSES) &&
      !t.data.interp.isNoun() &&
      // todo: fasten
      !t.parent.children.some((x) =>
        uEqSome(x.data.rel, ['advcl'] /* g.SUBORDINATE_CLAUSES */),
      ),
  )

  reportIf(`заперечення під’єднане не до cop/aux`, (t) => {
    if (
      !uEq(t.data.rel, 'advmod') ||
      !t.data.interp.isNegative() ||
      t.parent.data.interp.isAuxillary()
    ) {
      return
    }
    let aux = t.parent.children.find((x) => x.data.interp.isAuxillary())
    if (!aux) {
      return
    }
    return (
      node2index.get(t) < node2index.get(aux) &&
      node2index.get(aux) < node2index.get(t.parent)
    )
  })

  reportIf(
    `parataxis:discourse в одне слово-недієслово`,
    (t) =>
      t.data.rel === 'parataxis:discourse' &&
      !t.children.length &&
      !t.data.interp.isVerb(),
  )

  xreportIf(
    `discourse у фразу`,
    (t) =>
      uEq(t.data.rel, 'discourse') &&
      t.children.filter((x) => !uEqSome(x.data.rel, ['fixed', 'punct'])).length,
  )

  reportIf(
    `кількісний прислівник модифікує множину`,
    (t) =>
      t.data.rel === 'advmod:amtgov' &&
      t.parent.data.interp.isPlural() &&
      !t.parent.data.interp.isNoSingular() &&
      !t.parent.data.interp.hasNonpositiveDegree() &&
      !['чимало', 'трохи'].includes(t.data.interp.lemma),
  )

  if (basicRoots.length === 1) {
    xreportIf(`non-projective`, g.isNonprojective)
  }

  // continuity/projectivity
  for (let token of nodes) {
    if (uEqSome(token.data.rel, g.CONTINUOUS_REL)) {
      let rootFromHere = token.root()

      let indexes = mu(walkDepth(token))
        .map((x) => node2index.get(x))
        .toArray()
        .sort(compareAscending)

      let holes = findHoles(indexes)
        .filter((i) => nodes[i].root() === rootFromHere)
        .map((x) => nodes[x])
        .filter(
          (x) =>
            !mu(x.walkThisAndUp0()).some((xx) =>
              xx.data.hasTag('legal_alien'),
            ) && !x.data.isElided(),
        )
        .map((x) => node2index.get(x))

      if (holes.length) {
        if (
          token.parent.data.interp.isAdverb() &&
          token.data.interp.isInfinitive()
        ) {
          continue
        }
        // console.error(sentence.map(x => x.form).join(' '))
        // console.error(indexes)
        // console.error(holes)
        continue
        problems.push({
          indexes: [...holes],
          message: `чужі токени всередині ${token.data.rel}`,
        })
      }
    }
  }

  {
    let lastToken = last(nodes)
    if (
      lastToken.data.rel &&
      !/[!?]|\.{3}|…/.test(lastToken.data.form) && // todo: add stricter condition
      lastToken.data.interp.isPunctuation() &&
      !lastToken.parents.some((x) => x.isRoot()) &&
      !lastToken.parents.some(
        (x) =>
          x.data.interp.isAbbreviation() ||
          uEq(x.data.rel, 'parataxis') ||
          x.data.rel.endsWith(':parataxis'),
      ) &&
      !lastToken.data.interp.isQuote() &&
      !(
        lastToken.data.interp.isForeign() &&
        lastToken.parent.data.form.length === 1
      ) &&
      !lastToken.parent.data.isGraft &&
      !(
        lastToken.data.interp.isClosing() &&
        lastToken.parent.children.some((x) => x.data.interp.isOpening())
      ) &&
      !(
        lastToken.data.interp.isQuote() &&
        mu(lastToken.parent.children)
          .filter((x) => x.data.interp.isQuote())
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
    let interests = nodes.filter(
      (t) =>
        !t.isRoot() &&
        uEq(t.data.rel, 'advmod') &&
        t.data.interp.isAdverb() &&
        g.isInfinitive(t.parent) &&
        // && t.parent.isRoot()
        // || !['acl', 'xcomp', 'c'].some(x => uEq(t.parent.node.rel, x)))
        g.SOME_MODAL_ADVS.some((form) => t.data.interp.lemma === form),
    )
    if (0 && interests.length) {
      problems.push({
        indexes: interests.map((x) => node2index.get(x)),
        message: `модальний прислівник не підкорінь`,
      })
    }
  }

  // todo
  xreportIf(
    `залежники голови складеного присудка`,
    (t) =>
      t.children.some(
        (x) =>
          x.data.interp.isInfinitive() &&
          uEqSome(x.data.rel, ['xcomp', 'csubj', 'ccomp']),
      ) && t.children.some((x) => uEqSome(x.data.rel, ['obl'])), // туду
  )

  reportIf(
    `cop без підмета`,
    (t) =>
      uEq(t.data.rel, 'cop') &&
      !t.parent.children.some((x) => uEqSome(x.data.rel, g.SUBJECTS)) &&
      !t.parent.data.interp.isAdverb() &&
      !t.parent.data.interp.isAdjective() &&
      !t.parent.data.interp.isInstrumental() &&
      !uEq(t.parent.data.rel, 'xcomp'),
  )

  reportIf(
    `conj без сполучника чи коми`,
    (t) => g.isConjWithoutCcOrPunct(t) && t.data.rel !== 'conj:svc',
  )

  reportIf(
    `conj без розділового чи сполучника (може conj:svc?)`,
    (t) =>
      g.isConjWithoutCcOrPunct(t) &&
      t.data.rel !== 'conj:svc' &&
      [
        f.VerbType.indicative,
        f.VerbType.infinitive,
        f.VerbType.imperative,
      ].includes(t.data.interp.getFeature(f.VerbType)),
  )

  reportIf(
    `advcl без сполучування (може advcl:svc?)`,
    (t) =>
      uEq(t.data.rel, 'advcl') &&
      t.data.rel !== 'advcl:pred' &&
      t.data.rel !== 'advcl:svc' &&
      [
        f.VerbType.indicative,
        f.VerbType.infinitive,
        f.VerbType.imperative,
        f.VerbType,
      ].includes(t.data.interp.getFeature(f.VerbType)) &&
      !t.children.some(
        (x) =>
          uEqSome(x.data.rel, ['mark']) ||
          x.data.interp.isRelative() ||
          x.data.interp.isPreposition(), // замість просто зробити
      ),
  )

  xreportIf(
    `ccomp:svc-test`,
    (t) =>
      t.data.rel === 'ccomp' &&
      [
        f.VerbType.indicative,
        f.VerbType.infinitive,
        f.VerbType.imperative,
      ].includes(t.data.interp.getFeature(f.VerbType)) &&
      !t.children.some(
        (x) =>
          uEqSome(x.data.rel, ['mark']) ||
          x.data.interp.isRelative() ||
          x.data.interp.isPreposition(), // замість просто зробити
      ),
  )

  xreportIf(
    `xcomp:svc-test`,
    (t) =>
      t.data.rel === 'xcomp' &&
      !t.parent.data.interp.isReversive() &&
      [
        f.VerbType.indicative,
        f.VerbType.infinitive,
        f.VerbType.imperative,
      ].includes(t.data.interp.getFeature(f.VerbType)) &&
      !t.children.some(
        (x) =>
          uEqSome(x.data.rel, ['mark']) ||
          x.data.interp.isRelative() ||
          x.data.interp.isPreposition(), // замість просто зробити
      ) &&
      !g.SOME_FREQUENT_TRANSITIVE_VERBS.includes(t.parent.data.interp.lemma) &&
      !t.parent.data.interp.isAdjective(),
  )

  reportIf(
    `compound:svc неочікуваний`,
    (t) => t.data.rel === 'compound:svc' && !g.isCompounSvcCandidate(t),
  )

  reportIf(
    `кандидат на compound:svc`,
    (t) => g.isCompounSvcCandidate(t) && t.data.rel !== 'compound:svc',
  )

  xreportIf(
    `не csubj з модального прислівника `,
    (t) =>
      !t.isRoot() &&
      t.parent.data.interp.isAdverb() &&
      t.data.interp.isInfinitive() &&
      !uEqSome(t.data.rel, ['csubj', 'conj']) &&
      !t.children.some((x) => uEqSome(x.data.rel, ['mark'])),
  )

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  reportIf(
    `неочікувана реляція в прийменник`,
    (t) =>
      t.data.rel &&
      t.data.interp.isPreposition() &&
      !uEqSome(t.data.rel, ['case', 'conj', 'fixed']) &&
      !t.children.some((x) => uEqSome(x.data.rel, ['fixed'])),
  )

  reportIf(
    `неочікувана реляція в частку`,
    (t) =>
      t.data.rel &&
      t.data.interp.isParticle() &&
      !uEqSome(t.data.rel, [
        'discourse',
        'advmod',
        'fixed',
        'flat:repeat',
        'goeswith',
      ]) &&
      !(
        uEqSome(t.data.rel, ['aux']) &&
        g.CONDITIONAL_AUX_LEMMAS.includes(t.data.interp.lemma)
      ),
    // && !t.children.some(x => uEqSome(x.node.rel, ['fixed']))
  )

  reportIf(
    `неочікувана реляція в вигук`,
    (t) =>
      t.data.rel &&
      !t.data.isGraft &&
      t.data.interp.isInterjection() &&
      !uEqSome(t.data.rel, ['discourse', 'flat:repeat']),
  )

  xreportIf(
    `неочікувана реляція в символ`,
    (t) =>
      t.data.rel &&
      t.data.interp.isSymbol() &&
      !uEqSome(t.data.rel, ['discourse']),
  )

  reportIf(
    `неочікувана реляція в :beforeadj`,
    (t) =>
      t.data.rel &&
      t.data.interp.isBeforeadj() &&
      (t.data.rel !== 'compound' ||
        t.parent.data.index < t.data.index ||
        !t.parent.data.interp.isAdjective()),
  )

  reportIf(
    `:beforeadj не має дефіса-залежника`,
    (t) =>
      t.data.interp.isBeforeadj() &&
      !t.isRoot() &&
      !t.children.some(
        (x) =>
          /^[−\-\–\—]$/.test(x.data.interp.lemma) &&
          x.data.index > t.data.index,
      ) &&
      !t.data.hasTag('no_dash'),
  )

  reportIf(
    `неочікувана реляція в PUNCT`,
    (t) =>
      t.data.rel &&
      t.data.interp.isPunctuation() &&
      !uEqSome(t.data.rel, ['punct']),
  )

  reportIf(
    `неочікувана реляція в дієприслівник`,
    (t) =>
      t.data.rel &&
      t.data.interp.isConverb() &&
      !uEqSome(t.data.rel, ['advcl', 'conj', 'parataxis:discourse']) &&
      !g.isAdverbialAcl(t) &&
      !(
        uEq(t.data.rel, 'cop') && g.COPULA_LEMMAS.includes(t.data.interp.lemma)
      ),
  )

  reportIf(
    `неочікувана реляція в AUX`,
    (t) =>
      t.data.rel &&
      t.data.interp.isAuxillary() &&
      !uEqSome(t.data.rel, ['aux', 'cop']),
    // && !(uEq(t.node.rel, 'aux') && CONDITIONSL_BY_LEMMAS.includes(t.node.interp.lemma))
    // && !t.children.some(x => uEqSome(x.node.rel, ['fixed']))
  )

  reportIf(
    `неочікувана реляція в сурядний`,
    (t) =>
      t.data.rel &&
      t.data.interp.isCoordinating() &&
      !uEqSome(t.data.rel, ['cc', 'fixed']),
  )

  reportIf(
    `неочікувана реляція в SCONJ`,
    (t) =>
      t.data.rel &&
      t.data.interp.isSubordinative() &&
      !uEqSome(t.data.rel, ['mark', 'fixed']),
  )

  xreportIf(
    `неочікувана реляція в іменник`,
    (t) =>
      t.data.rel &&
      t.data.interp.isNoun() &&
      !uEqSome(t.data.rel, [
        'nsubj',
        'nmod',
        'appos',
        'conj',
        'obj',
        'iobj',
        'obl',
        'flat:title',
        'flat:name',
        'xcomp:pred',
        'flat:repeat',
        'parataxis:discourse',
      ]) &&
      !(
        uEqSome(t.data.rel, ['advcl']) &&
        t.children.some((x) => uEqSome(x.data.rel, ['mark']))
      ) &&
      !uEqSome(t.data.rel, [...g.CLAUSAL_MODIFIERS]), // todo
  )

  reportIf(
    `неочікувана реляція в дієслово`,
    (t) =>
      t.data.rel &&
      !t.data.isGraft &&
      t.data.interp.isVerb() &&
      !t.data.interp.isAuxillary() &&
      !uEqSome(t.data.rel, [...g.CLAUSE_RELS, 'conj']) &&
      !['compound:svc', 'orphan', 'flat:repeat', 'flat:sibl'].includes(
        t.data.rel,
      ) &&
      !(uEq(t.data.rel, 'appos') /* && t.node.interp.isInfinitive() */) &&
      !(uEq(t.data.rel, 'obl') && t.data.hasTag('inf_prep')),
  )

  reportIf(
    `неочікувана реляція в DET`,
    (t) =>
      t.data.rel &&
      // && !t.node.isPromoted
      toUd(t.data.interp).pos === 'DET' && // todo: .isDet()
      !uEqSome(t.data.rel, [
        'det',
        'conj',
        'fixed',
        'xcomp:pred',
        'advcl:pred',
      ]) &&
      !uEqSome(t.data.rel, ['nsubj', 'obj', 'iobj', 'obl', 'nmod']) &&
      !uEqSome(t.data.rel, ['advmod:det', 'flat:abs']) &&
      !g.findRelativeClauseRoot(t),
  )

  // todo
  xreportIf(
    `неочікувана реляція в кількісний числівник`,
    (t) =>
      t.data.rel &&
      t.data.interp.isCardinalNumeral() &&
      !t.data.isPromoted &&
      !uEqSome(t.data.rel, ['nummod', 'conj', 'flat:title']) &&
      !(
        toUd(t.data.interp).pos === 'DET' &&
        uEqSome(t.data.rel, ['det:nummod', 'det:numgov', 'conj'])
      ),
  )

  reportIf(
    `неочікувана реляція в кличний іменник`,
    (t) =>
      t.data.rel &&
      t.data.interp.isVocative() &&
      t.data.interp.isNounish() &&
      !uEqSome(t.data.rel, [
        'vocative',
        'flat:name',
        'conj',
        'flat:title',
        'flat:repeat',
        'parataxis',
        'appos',
      ]),
  )

  reportIf(
    `неочікувана реляція в називний іменник`,
    (t) =>
      t.data.rel &&
      t.data.interp.isNominative() &&
      t.data.interp.isNounish() &&
      uEqSome(t.data.rel, ['nmod', 'orphan']),
    // && !uEqSome(t.node.rel, ['nsubj', 'flat:title', 'flat:name',
    //   'flat:repeat', 'parataxis', 'conj', 'appos', 'expl',
    // ])
    // todo
  )

  reportIf(
    `неочікувана реляція в :stem`,
    (t) =>
      t.data.rel &&
      t.data.interp.isStem() &&
      !uEqSome(t.data.rel, ['compound']),
  )

  reportIf(
    `неочікувана реляція в прислівник з іменника`,
    (t) =>
      !t.isRoot() &&
      t.data.interp.isAdverb() &&
      t.parent.data.interp.isNounish() &&
      t.data.rel !== 'acl:adv' &&
      t.data.rel !== 'advmod:gerund' && // ліміт на пости туди
      !t.data.interp.isAdjectiveAsNoun() && // цілком нове
      !g.thisOrConjHead(t, (x) => uEqSome(x.node?.rel, ['obl'])) &&
      !uEqSome(t.data.rel, ['discourse', 'parataxis', 'orphan']) &&
      !uEqSome(t.parent.data.rel, ['orphan']) &&
      !t.parent.children.some((x) => uEqSome(x.data.rel, ['nsubj', 'cop'])) &&
      !(['не'].includes(t.data.interp.lemma) && t.data.interp.isNegative()) &&
      !g.isQuantitativeAdverbModifier(t) &&
      !g.isModalAdv(t) &&
      !g.NOUN_MODIFIABLE_ADVS.includes(t.data.interp.lemma) &&
      !(uEqSome(t.data.rel, g.CLAUSAL_MODIFIERS) && g.hasPredication(t)) &&
      // [росте] ліщина колючого горіха, ялини , де-не-де берізки, берестина
      !(uEqSome(t.data.rel, ['conj']) && g.hasChild(t, 'flat:sibl')),
  )

  xreportIf(
    `неочікувана реляція в прислівник`,
    (t) =>
      t.data.rel &&
      t.data.interp.isAdverb() &&
      !t.parent.data.interp.isNounish() &&
      !uEqSome(t.data.rel, ['advmod', 'discourse', 'conj', 'fixed']) &&
      !g.isModalAdv(t),
  )

  // ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

  tmpxreportIf(
    `означення при займеннику`,
    (t) =>
      uEqSome(t.data.rel, ['amod', 'det']) &&
      !g.isNumericModifier(t.data.rel) &&
      t.parent.data.interp.isNoun() &&
      t.parent.data.interp.isPronominal() &&
      !t.parent.data.interp.isIndefinite() &&
      !t.parent.data.interp.isGeneral(),
    // && ![
    //   ['весь', 'це'],
    // ].some(([adjLemma, pronLemma]) => t.node.interp.lemma === adjLemma
    //   && t.parent.node.interp.lemma === pronLemma
    // )
  )

  reportIf(
    `nummod праворуч`,
    (t) =>
      isNumericModifier(t.data.rel) &&
      node2index.get(t) > node2index.get(t.parent) &&
      !(
        t.parent.data.interp.isGenitive() &&
        t.parent.data.interp.isPlural() &&
        t.data.interp.isAccusative()
      ) &&
      !g.CURRENCY_SYMBOLS.includes(t.parent.data.interp.lemma) &&
      !t.data.hasTag('right-nummod'),
  )

  xreportIf(
    `підрядне наслідку — головне`,
    (t) =>
      uEqSome(t.data.rel, ['advcl']) &&
      // todo: generalize
      t.children.some(
        (x) =>
          x.data.interp.lemma === 'тому' && x.data.interp.isDemonstrative(),
      ),
  )

  reportIf(
    `порядковий праворуч`,
    (t) =>
      /^\d+$/.test(t.data.form) &&
      uEqSome(t.data.rel, ['amod']) &&
      t.data.interp.isOrdinalNumeral() &&
      t.data.index > t.parent.data.index,
  )

  reportIf(
    `неочікуваний відмінок nmod`,
    (t) =>
      uEqSome(t.data.rel, ['nmod']) &&
      t.data.interp.isAccusative() &&
      !g.hasChild(t, 'case') &&
      !t.children.some(
        (x) => x.data.interp.lemma === '/' && x.data.index < t.data.index,
      ) &&
      !(t.parent.data.interp.isParticiple() && t.parent.data.interp.isActive()),
  )

  xreportIf(
    `неочікуваний орудний nmod`,
    (t) =>
      uEqSome(t.data.rel, ['nmod']) &&
      t.data.interp.isInstrumental() &&
      !g.hasChild(t, 'case'),
    // && !g.SOME_DATIVE_VALENCY_NOUNS.has(t.parent.node.interp.lemma)
  )

  reportIf(
    `неочікуваний давальний nmod`,
    (t) =>
      uEqSome(t.data.rel, ['nmod']) &&
      t.data.interp.isDative() &&
      !g.SOME_DATIVE_VALENCY_NOUNS.has(t.parent.data.interp.lemma),
  )

  reportIf(
    `неочікуваний відмінок прикметника-присудка`,
    (t) =>
      g.hasChild(t, 'nsubj') &&
      t.data.interp.isAdjective() &&
      !t.data.isPromoted &&
      !t.data.interp.isNominative() &&
      !t.data.interp.isDative() && // слава Україні
      !(t.data.interp.isInstrumental() && g.hasCopula(t)),
  )

  reportIf(
    `родовий прямий додаток без заперечення`,
    (t) =>
      uEqSome(t.data.rel, ['obj']) &&
      g.thisOrGovernedCase(t) === f.Case.genitive &&
      t.parent.data.interp.isVerbial() &&
      !g.isNegated(t.parent) &&
      !t.parent.data.interp.isReversive() && // злякався кабана, стосується жителя
      !g.isQuantitativeAdverbModified(t) && // багато дощу
      !(
        t.parent.data.interp.isInfinitive() &&
        t.parent.parent &&
        t.parent.parent.children.some((x) => x.data.interp.isNegative())
      ) &&
      // пішло до 10 штук
      !t.children.some(
        (x) => uEq(x.data.rel, 'nummod') && g.hasChild(x, 'case'),
      ) &&
      // same form in acc exists
      analyzer
        .tag(t.data.form)
        .some(
          (x) =>
            x.isAccusative() &&
            !x.isGrammaticallyAnimate() &&
            x.equalsByLemmaAndFeatures(t.data.interp, [
              f.Pos,
              f.MorphNumber,
              f.Gender,
              f.Animacy,
            ]),
        ),
  )

  xreportIf(
    `омонімічний родовому знахідний прямий додаток без заперечення`,
    (t) =>
      uEqSome(t.data.rel, ['obj']) &&
      g.thisOrGovernedCase(t) === f.Case.accusative &&
      !g.isNegated(t.parent) &&
      // same form in gen exists
      analyzer
        .tag(t.data.getForm())
        .some(
          (x) =>
            x.isGenitive() &&
            x.equalsByLemmaAndFeatures(t.data.interp, [
              f.Pos,
              f.Animacy,
              f.Gender,
              f.MorphNumber,
            ]),
        ),
    // && t.node.interp.isAnimate()
  )

  xreportIf(
    `омонімічний родовому знахідний прямий додаток із запереченням`,
    (t) =>
      uEqSome(t.data.rel, ['obj']) &&
      g.thisOrGovernedCase(t) === f.Case.accusative &&
      g.isNegated(t.parent) &&
      !t.data.interp.isPersonal() && // temp
      !['ніхто', 'ніщо'].includes(t.data.interp.lemma) && // temp
      // same form in gen exists
      analyzer
        .tag(t.data.getForm())
        .some(
          (x) =>
            x.isGenitive() &&
            x.equalsByLemmaAndFeatures(t.data.interp, [
              f.Pos,
              f.Animacy,
              f.Gender,
              f.MorphNumber,
            ]),
        ),
    // && t.node.interp.isAnimate()
  )

  reportIf2(
    `:animish із запереченням`,
    ({ i, p }) => p && i.isGrammaticallyAnimate() && g.isNegated(p),
  )

  xreportIf(
    `вказують як синонім`,
    (t) =>
      (t.data.interp.isNounish() || t.data.interp.isAdjective()) &&
      (t.data.interp.isNominative() || t.data.interp.isAccusative()) &&
      t.children.some((x) => x.data.interp.lemma === 'як'),
  )

  reportIf(
    `„більш/менш ніж“ не fixed`,
    (t) =>
      g.COMPARATIVE_SCONJS.includes(t.data.form) &&
      tokens[t.data.index - 1] &&
      g.COMPARATIVE_ADVS.includes(tokens[t.data.index - 1].form) &&
      !uEq(t.data.rel, 'fixed'),
  )

  reportIf(
    `advcl під’єднане до порівняльного прислівника`,
    (t) =>
      !t.isRoot() &&
      (t.parent.data.interp.isComparable() ||
        t.parent.data.interp.isAdjective()) &&
      g.hasChild(t, 'advcl') &&
      t.data.interp.isAdverb() &&
      t.data.interp.isComparative(),
  )

  // reportIf2(`advcl під’єднане до порівняльного прислівника`,
  //   ({ n, pi, i }) => !n.isRoot()
  //     && pi.isAdjective()
  //     && g.hasChild(n, 'advcl')
  //     && i.isAdverb()
  //     && i.isComparative()
  // )

  reportIf(
    `питальний займенник без „?“`,
    (t) =>
      !t.isRoot() &&
      t.data.interp.isInterrogative() &&
      !g.thisOrConjHead(t, (x) =>
        x.children.some((xx) => xx.node?.interp.lemma.includes('?')),
      ) &&
      !g.thisOrConjHead(t.parent, (x) =>
        x.children.some((xx) => xx.node?.interp.lemma.includes('?')),
      ) &&
      !mu(t.walkThisAndUp0()) &&
      //   .some(x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
      !t.data.hasTag('no_qmark'),
  )

  reportIf(
    `непитальний займенник з „?“`,
    (t) =>
      !t.isRoot() &&
      (t.data.interp.isRelative() || t.data.interp.isIndefinite()) &&
      // && !t.node.interp.isInterrogative()
      g.thisOrConjHead(t, (x) =>
        x.children.some((xx) => xx.node?.interp.lemma.includes('?')),
      ),
    // && mu(t.walkThisAndUp0())
    //   .some(x => x.children.some(xx => xx.node.interp.lemma.includes('?')))
    // && !t.node.hasTag('no_qmark')
  )

  reportIf(
    `неочікуваний advmod`,
    (t) =>
      uEq(t.data.rel, 'advmod') &&
      t.data.rel !== 'advmod:amtgov' &&
      !g.isFeasibleAdvmod(t.parent, t),
  )

  // reportIf(`неочікуване advcl`,
  //   t => uEq(t.node.rel, 'advcl')
  //     // && t.node.rel !== 'advmod:amtgov'
  //     && !g.isFeasibleAdvcl(t.parent, t)
  // )

  xreportIf(
    `не flat:title в „№“`,
    (t) =>
      t.data.interp.lemma.includes('№') &&
      !t.isRoot() &&
      !uEqSome(t.data.rel, ['flat:title', 'conj']),
  )

  reportIf(
    `не flat:title з „№“ в числівник`,
    (t) =>
      !t.isRoot() &&
      t.parent.data.interp.lemma.includes('№') &&
      t.data.interp.isCardinalNumeral() &&
      !uEqSome(t.data.rel, ['flat:title']),
  )

  reportIf(
    `еліпс наперед`,
    (t) =>
      t.data.comment && /еліпс.* наперед/.test(t.data.comment.toLowerCase()),
  )

  reportIf2(
    `невказівне _тому_ вжите як вказівне`,
    ({ n, l, pr, i }) =>
      l === 'тому' &&
      !i.isDemonstrative() &&
      !n.isRoot() &&
      uEqSome(pr, g.SUBORDINATE_CLAUSES) &&
      !uEqSome(pr, ['ccomp']) &&
      !g.hasChild(n, 'obl'),
  )

  xreportIf2(
    `вказівне _тому_ вжите як часове`,
    ({ t, pr, n, l }) =>
      l === 'тому' &&
      t.interp.isDemonstrative() &&
      (uEq(pr, 'obl') || g.hasChild(n, 'obl')),
  )

  // symmetrical to English
  reportIf2(
    `N часу тому — _тому_ не голова`,
    ({ t, pr }) =>
      t.interp.lemma === 'тому' &&
      !t.interp.isDemonstrative() &&
      uEq(pr, 'obl'),
  )

  reportIf2(
    `порядковий числівник при місяці`,
    ({ r, t, i, pl }) =>
      uEq(r, 'amod') && i.isOrdinalNumeral() && g.MONTHS.includes(pl),
  )

  reportIf2(
    `неочікуване морфо числа при місяці`,
    ({ r, pi, l }) =>
      uEq(r, 'nmod') &&
      g.MONTHS.includes(l) &&
      !(pi.isOrdinalNumeral() && pi.isNeuter()),
  )

  // яке, що
  xreportIf2(
    `неузгодження acl`,
    ({ r, c }) =>
      uEq(r, 'acl') && c.some((x) => x.data.interp.lemma === 'який'),
    // &&
  )

  reportIf(
    `flat:sibl не з conj / не з присудка`,
    (t) =>
      t.data.rel === 'flat:sibl' &&
      !uEq(t.parent.data.rel, 'conj') &&
      !t.parent.children.some((x) => uEqSome(x.data.rel, ['conj', 'nsubj'])),
  )

  xreportIf2(
    `іменник-числівник має неочікувані залежники`,
    ({ i, c }) =>
      i.isNounNumeral() &&
      (c.length > 1 || (c.length && c[0].data.rel !== 'nmod')),
  )

  reportIf2(
    `прислівник _може_ не discourse`,
    ({ n, i, r }) =>
      i.lemma === 'може' && i.isAdverb() && !uEq(r, 'discourse') && !n.isRoot(),
  )

  reportIf(
    `більше ніж один тип імені в пучку`,
    (t) =>
      !t.data.hasTag('multi_names') &&
      Object.values(
        groupBy(
          t.children.filter((x) => x.data.rel === 'flat:name'),
          (x) => x.data.interp.getFeature(f.NameType),
        ),
      ).some((x) => x.length > 1),
  )

  xreportIf2(
    `тест: наказовий має підмет`,
    ({ pi, r }) => uEqSome(r, g.SUBJECTS) && pi.isImperative(),
  )

  // ************  obj/iobj vs obl  ************** //

  reportIf(
    'obj/iobj має прийменник',
    (t) => uEqSome(t.data.rel, ['obj', 'iobj']) && g.hasChild(t, 'case'),
  )

  // disablable
  // only temporals allowed
  xreportIf(
    `неорудний obl без прийменника`,
    (t) =>
      uEq(t.data.rel, 'obl') &&
      !t.data.hasTag('prepless_obl') &&
      !t.data.isPromoted &&
      !hasChildrenOfUrel(t, 'case') &&
      !t.data.interp.isInstrumental() &&
      !(
        (t.data.interp.isAccusative() || t.data.interp.isGenitive()) &&
        g.TEMPORAL_ACCUSATIVES.includes(t.data.interp.lemma)
      ),
  )

  xreportIf(
    `орудний obl без прийменника`,
    (t) =>
      uEq(t.data.rel, 'obl') &&
      !t.data.hasTag('prepless_obl') &&
      !hasChildrenOfUrel(t, 'case') &&
      t.data.interp.isInstrumental(),
  )

  reportIf(
    `неочікуваний відмінок obj`,
    (t) =>
      uEqSome(t.data.rel, ['obj']) &&
      !t.data.isGraft &&
      !(t.data.interp.isForeign() && !t.data.interp.hasCase()) &&
      g.thisOrGovernedCase(t) !== f.Case.accusative &&
      g.thisOrGovernedCase(t) !== f.Case.genitive &&
      !(
        (
          g.thisOrGovernedCase(t) === f.Case.instrumental &&
          g.INS_VALENCY_VERBS.includes(t.parent.data.interp.lemma)
        ) // ~
      ) &&
      // legacy
      !(
        t.data.interp.isDative() &&
        !t.parent.children.some((x) => uEq(x.data.rel, 'iobj'))
      ) &&
      !t.children.some((x) => uEqSome(x.data.rel, ['flat:abs'])),
    // && !t.parent.node.interp.isReversive()  // todo
  )

  reportIf(
    `орудний obl в орудному дієслові`,
    (t) =>
      uEqSome(t.data.rel, ['obl']) &&
      g.thisOrGovernedCase(t) === f.Case.instrumental &&
      g.INS_VALENCY_VERBS.includes(t.parent.data.interp.lemma),
  )

  reportIf(
    `неочікуваний відмінок iobj`,
    (t) =>
      uEq(t.data.rel, 'iobj') &&
      !t.data.isGraft &&
      g.thisOrGovernedCase(t) !== f.Case.dative &&
      !(t.data.interp.isForeign() && !t.data.interp.hasCase()) &&
      !(
        t.parent.children.some(
          (x) =>
            uEq(x.data.rel, 'obj') &&
            g.thisOrGovernedCase(x) === f.Case.genitive,
        ) && g.thisOrGovernedCase(t) === f.Case.accusative
      ) &&
      !g.hasSiblink(t, 'ccomp') &&
      !(t.data.interp.isNominative() && g.hasChild(t, 'flat:abs')),
  )

  reportIf(
    `неочікуваний відмінок obl`,
    (t) =>
      uEq(t.data.rel, 'obl') &&
      !t.data.isGraft &&
      !(t.data.interp.isForeign() && !t.data.interp.hasCase()) &&
      (g.thisOrGovernedCase(t) === f.Case.nominative ||
        g.thisOrGovernedCase(t) === f.Case.vocative) &&
      !g.isDenUDen(t) &&
      !(
        t.data.interp.isNominative() &&
        t.children.some((x) => uEqSome(x.data.rel, ['flat:abs']))
      ) &&
      !(t.data.interp.isNominative() && ['сам'].includes(t.data.interp.lemma)),
  )

  reportIf(
    `cop/aux в наказовому`,
    (t) =>
      uEqSome(t.data.rel, ['cop', 'aux']) &&
      t.data.interp.isImperative() &&
      !t.data.hasTag('ok-imp-cop'),
  )

  reportIf(
    `наказовий має cop/aux`,
    (t) =>
      t.data.interp.isImperative() &&
      t.children.some((x) => uEqSome(x.data.rel, ['cop', 'aux'])),
  )

  xreportIf2(
    `велика літера не власна`,
    ({ t, i }) =>
      t.index > 0 &&
      startsWithCapital(t.getForm()) &&
      !i.isProper() &&
      !i.isAbbreviation(),
  )

  reportIf2(
    `не родовий однини після десяткового`,
    ({ r, n, pi }) =>
      uEq(r, 'nummod') &&
      g.canBeDecimalFraction(n) &&
      (pi.isPlural() || pi.getFeature(f.Case) !== f.Case.genitive),
  )

  reportIf2(
    `неочікуваний залежник nummod’ду`, // todo
    ({ r, pr, i, n, pi }) =>
      pr &&
      g.isNumericModifier(pr) &&
      !uEqSome(r, ['compound', 'conj', 'discourse', 'punct']) &&
      r !== 'flat:range' &&
      !(
        uEq(r, 'case') &&
        ['від', 'до', 'близько', 'понад', 'коло'].includes(i.lemma)
      ) &&
      !(
        uEq(r, 'advmod') &&
        [
          'не',
          'ні',
          /* <- todo */ 'майже',
          '~',
          'щонайменше',
          'приблизно',
          'принаймні',
        ].includes(i.lemma)
      ) &&
      !g.hasChild(n, 'fixed') && // todo
      !(pi.isPronominal() && i.isAdverb() && ['так', 'дуже'].includes(i.lemma)),
  )

  xreportIf2(
    `xcomp не має явного підмета`,
    ({ n, r, p }) => uEq(r, 'xcomp') && !g.findXcompSubject(n),
  )

  reportIf2(
    `потенційне _що її_ без кореференції чи #not-shchojiji`,
    ({ n, t }) => {
      if (t.hasTag('not-shchojiji')) {
        return false
      }
      let antecedent = g.findShchojijiAntecedent(n)
      if (!antecedent) {
        return false
      }
      return !corefClusterization.areSameGroup(antecedent.data, t)
    },
  )

  if (valencyDict) {
    reportIf(
      `неперехідне дієслово має додаток`,
      (t) =>
        uEqSome(t.data.rel, ['obj' /* , 'iobj' */]) &&
        t.parent.data.interp.isVerb() &&
        valencyDict.isIntransitiveOnlyVerb(t.parent.data.interp.lemma) &&
        !(uEq(t.data.rel, 'obj') && t.data.interp.isDative()) &&
        !t.data.interp.isGenitive() &&
        !(
          g.thisOrGovernedCase(t) === f.Case.instrumental &&
          g.INS_VALENCY_VERBS.includes(t.parent.data.interp.lemma)
        ) &&
        !(
          g.thisOrGovernedCase(t) === f.Case.accusative &&
          g.SOME_WORDS_WITH_ACC_VALENCY.has(t.parent.data.interp.lemma)
        ) &&
        !(
          t.parent.data.interp.isNeuter() &&
          t.parent.data.interp.isReversive() &&
          (valencyDict.isAmbigiousVerb(
            t.parent.data.interp.lemma.slice(0, -2),
          ) ||
            g.SOME_WORDS_WITH_ACC_VALENCY.has(
              t.parent.data.interp.lemma.slice(0, -2),
            ))
        ),
    )

    xreportIf(
      `перехідне дієслово не має додатка`,
      (t) =>
        t.data.interp.isVerb() &&
        valencyDict.isAccusativeOnlyVerb(t.data.interp.lemma) &&
        !thisOrConj(
          t,
          (tt) =>
            tt.children.length &&
            (tt.children.some((x) =>
              uEqSome(x.data.rel, g.CORE_COMPLEMENTS_XCOMP),
            ) ||
              tt.children.some(
                (x) => uEq(x.data.rel, 'iobj') && x.data.interp.isDative(),
              )),
        ),
    )

    const johojiji = ['його', 'її', 'їх']
    const johojijiStr = ['його', 'її', 'їх'].join('/')

    xreportIf(
      `${johojijiStr}-прикметник замість іменника`,
      (t) =>
        johojiji.includes(t.data.form.toLowerCase()) &&
        t.data.interp.isAdjective() &&
        t.parent &&
        t.parent.data.interp.isNoun() &&
        valencyDict.isTransitiveOnlyGerund(t.parent.data.interp.lemma),
    )

    xreportIf(
      `${johojijiStr}-прикметник замість іменника (потенційно)`,
      (t) =>
        johojiji.includes(t.data.form.toLowerCase()) &&
        t.data.interp.isAdjective() &&
        t.parent &&
        t.parent.data.interp.isNoun() &&
        valencyDict.isAmbigiousGerund(t.parent.data.interp.lemma),
    )

    xreportIf(
      `${johojijiStr}-прикметник замість іменника (-ння)`,
      (t) =>
        johojiji.includes(t.data.form.toLowerCase()) &&
        t.data.interp.isAdjective() &&
        t.parent &&
        t.parent.data.interp.isNoun() &&
        t.parent.data.interp.lemma.endsWith('ння') &&
        !valencyDict.hasGerund(t.parent.data.interp.lemma),
    )

    xreportIf(
      `${johojijiStr}-іменник замість прикметника`,
      (t) =>
        johojiji.includes(t.data.form.toLowerCase()) &&
        t.data.interp.isNoun() &&
        t.parent &&
        t.parent.data.interp.isNoun() &&
        valencyDict.isIntransitiveOnlyGerund(t.parent.data.interp.lemma),
    )

    xreportIf(
      `${johojijiStr}-іменник замість прикметника (потенційно)`,
      (t) =>
        johojiji.includes(t.data.form.toLowerCase()) &&
        t.data.interp.isNoun() &&
        t.parent &&
        t.parent.data.interp.isNoun() &&
        valencyDict.isAmbigiousGerund(t.parent.data.interp.lemma),
    )

    xreportIf(
      `${johojijiStr}-іменник замість прикметника (-ння)`,
      (t) =>
        johojiji.includes(t.data.form.toLowerCase()) &&
        t.data.interp.isNoun() &&
        t.parent &&
        t.parent.data.interp.isNoun() &&
        t.parent.data.interp.lemma.endsWith('ння') &&
        !valencyDict.hasGerund(t.parent.data.interp.lemma),
    )

    reportIf2(
      `в звороті типу _вчити дитину математики_ переплутані patient з addressee`,
      ({ r, i, p }) =>
        uEq(r, 'iobj') &&
        i.isGenitive() &&
        p.children.some(
          (x) => uEq(x.data.rel, 'obj') && x.data.interp.isAccusative(),
        ),
    )

    tmpxreportIf2(`чистий flat`, ({ r }) => r === 'flat')

    reportIf2(
      `голова orphan’а не під’єднана до реконструкції пропуска`,
      ({ n, r }) =>
        uEq(r, 'orphan') && !n.parent.parents.some((x) => x.data.isElided()),
    )

    reportIf2(
      `orphan не під’єднаний до реконструкції пропуска`,
      ({ n, r }) =>
        uEq(r, 'orphan') && !n.parents.some((x) => x.data.isElided()),
    )

    reportIf2(
      `orphan в пропуск`,
      ({ r, t }) => uEq(r, 'orphan') && t.isElided(),
    )

    reportIf2(
      `orphan з пропуска`,
      ({ pt, r }) => uEq(r, 'orphan') && pt.isElided(),
    )

    reportIf2(
      `непід’єднаний пропуск`,
      ({ n, t }) => t.isElided() && n.isRoot() && !n.hasChildren(),
    )

    // todo
    xreportIf(
      `ADV має іменникові інтерпретації`,
      (t) =>
        t.data.interp.isAdverb() &&
        analyzer.tag(t.data.form).some((x) => x.isNoun() && !x.isVocative()) &&
        !g.VALID_ADVS_AMBIG_TO_NOUN.has(t.data.form.toLowerCase()) &&
        !t.data.interp.isAbbreviation(),
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

    tmpxreportIf2(
      `Promoted не прикметник`,
      ({ n, t, i }) =>
        t.isPromoted &&
        !i.isAdjectivish() &&
        !i.isCardinalNumeral() &&
        !n.parents.some((x) => x.data.isElided()) &&
        !t.hasTag('promoted-not-adj') &&
        !t.hasTag('orphanless-elision') &&
        !t.hasTag('nominal-ellipsis'),
    )

    reportIf2(
      `токен позначено “ожеледиця”`,
      ({ t }) =>
        t.comment &&
        t.comment.toLowerCase().includes('ожеледиця') &&
        !t.comment.toLowerCase().includes('лжеожеледиця'),
    )

    reportIf(
      `недієслівна предикація праворуч`,
      (t) =>
        uEqSome(t.data.rel, ['nsubj' /* , 'csubj' */]) &&
        t.data.index > t.parent.data.index &&
        !t.parent.data.interp.isVerbial() &&
        !t.parent.data.interp.isAdjective() && // ~
        !t.parent.data.interp.isAdverb() &&
        !t.parent.data.interp.isInstrumental() &&
        !t.parent.data.interp.isInterrogative() &&
        !g.hasChild(t.parent, 'expl') &&
        !t.data.hasTag('pred-right'),
    )

    xreportIf(
      `присудок є залежником`,
      (t) =>
        uEqSome(t.data.rel, ['nsubj', 'csubj', 'cop']) &&
        t.parent.parent &&
        !uEqSome(t.parent.data.rel, [...g.CLAUSE_RELS, 'conj']) &&
        !t.parent.data.isGraft &&
        !['compound:svc', 'orphan'].includes(t.parent.data.rel),
    )

    if (sentenceHasOneRoot) {
      let sentenceWithoutPunct = tokens.filter((x) => !x.interp.isPunctuation())
      let skip = sentenceWithoutPunct.length === 1
      // && [
      //   f.Pos.noun,
      //   f.Pos.particle,
      //   f.Pos.interjection,
      //   f.Pos.cardinalNumeral,
      //   f.Pos.sym,
      // ].includes(sentenceWithoutPunct[0].interp.getFeature(f.Pos))
      if (!skip) {
        tmpxreportIf(
          `корінь без предикації`,
          (t) => t.isRoot() && !g.hasPredication(t),
        )
      }
    }

    xreportIf(
      `давальний з інфінітива`,
      (t) =>
        uEqSome(t.data.rel, ['obj', 'iobj']) &&
        t.data.interp.isDative() &&
        g.isInfinitive(t.parent) &&
        !uEqSome(t.parent.data.rel, g.SUBORDINATE_CLAUSES),
    )

    // disablable
    xreportIf(
      `такий xxx не advmod:det`,
      (t) =>
        g.ADVMOD_DETS.has(t.data.interp.lemma) &&
        t.data.interp.isAdjective() &&
        (t.parent || sentenceHasOneRoot) &&
        tokens[t.data.index + 1] &&
        !(
          t.parent === nodes[t.data.index + 1] && t.data.rel === 'advmod:det'
        ) &&
        tokens[t.data.index + 1].interp.equalsByFeatures(t.data.interp, [
          f.Pos,
          f.Case,
          f.Gender,
        ]),
    )

    xreportIf(
      `advmod:det в непорівнюване`,
      (t) =>
        t.data.rel === 'advmod:det' && !t.parent.data.interp.isComparable(),
    )

    xreportIf(
      `advcl під’єднане напряму до вказівного`,
      (t) =>
        uEq(t.data.rel, 'advmod') &&
        t.data.interp.isDemonstrative() &&
        t.children.some((x) => uEq(x.data.rel, 'advcl')),
    )

    tmpxreportIf(
      `advcl: під’єднане не напряму до вказівного`,
      (t) =>
        uEq(t.data.rel, 'advmod') &&
        t.data.interp.isDemonstrative() &&
        t.parent.children.some(
          (x) => uEq(x.data.rel, 'advcl') && x.data.rel !== 'advcl:cmp',
        ) &&
        !g.hasChild(t, 'advcl'),
      // todo: ~тому, тоді навпаки

      // коли наш лікнеп зробить своє діло серед нашого пролетаріату ,
      // тоді те пролетарське мистецтво , що про нього ми зараз будемо говорити ,
      // воістину буде творити чудеса
    )

    tmpxreportIf(
      `advcl:cmp під’єднане не напряму до вказівного`,
      (t) =>
        uEq(t.data.rel, 'advmod') &&
        t.data.interp.isDemonstrative() &&
        t.parent.children.some(
          (x) => uEq(x.data.rel, 'advcl') && x.data.rel === 'advcl:cmp',
        ),
    )

    reportIf(
      `неочікуваний клей між цим і наступним словом`,
      (t) =>
        t.data.index < tokens.length - 1 &&
        t.data.gluedNext &&
        !g.areOkToBeGlued(t, nodes[t.data.index + 1]) &&
        !t.data.hasTag('ok-glued-next'),
    )

    reportIf(
      `дискурсивне слово не discourse`,
      (t) =>
        !t.isRoot() &&
        !uEqSome(t.data.rel, ['discourse']) &&
        ['наприклад'].includes(t.data.interp.lemma),
    )

    xreportIf(
      `особовий в :irrel з _що_`,
      (t) =>
        t.data.interp.isPersonal() &&
        wiith(
          mu(t.walkThisAndUp0()).find((x) => x.data.rel === 'acl:irrel'),
          (acl) =>
            acl &&
            acl.children.some(
              (x) => uEq(x.data.rel, 'mark') && x.data.interp.lemma === 'що',
            ),
        ),
    )

    xreportIf(
      `нерозрізнений acl зі сполучником _що_`,
      (t) =>
        uEq(t.data.rel, 'acl') &&
        t.children.some(
          (x) => uEq(x.data.rel, 'mark') && x.data.interp.lemma === 'що',
        ),
      // && !g.isRelativeSpecificAcl(t.node.rel)
    )

    xreportIf(
      `нерозрізнений acl зі сполучником іншим від _що_`,
      (t) =>
        uEq(t.data.rel, 'acl') &&
        t.children.some(
          (x) => uEq(x.data.rel, 'mark') && x.data.interp.lemma !== 'що',
        ),
      // && !g.isRelativeSpecificAcl(t.node.rel)
    )

    xreportIf(
      `нерозрізнений acl без сполучника`,
      (t) =>
        uEq(t.data.rel, 'acl') &&
        !t.children.some((x) => uEq(x.data.rel, 'mark')) &&
        // && !g.isRelativeSpecificAcl(t.node.rel)
        !['acl:adv'].includes(t.data.rel),
    )

    xreportIf(
      `нерозрізнений acl з відносним ADV`,
      (t) =>
        t.data.interp.isRelative() &&
        t.data.interp.isAdverb() &&
        wiithNonempty(g.findRelativeClauseRoot(t), (relclRoot) =>
          // relclRoot.node.rel === 'acl'
          g.isRelclByRef(
            enhancedNodes[relclRoot.data.index].incomingArrows.find((x) =>
              uEq(x.attrib, 'acl'),
            ),
          ),
        ),
    )

    // reportIf(``, t =>
    //   t.node.interp.isRelative()
    //   && t.node.interp.isAdverb()
    //   && wiithNonempty(g.findRelativeClauseRoot(t), relclRoot =>
    //     // relclRoot.node.rel === 'acl'
    //     g.isRelclByRef(enhancedNodes[relclRoot.node.index]
    //       .incomingArrows.find(x => uEq(x.attrib, 'acl'))
    //     )
    //   )
    // )

    ereportIf(
      `acl без ref’а з відносним прислівником`,
      (a) =>
        uEq(a.attrib, 'acl') &&
        !g.isRelclByRef(a) &&
        a.end
          .walkForwardWidth({ cutAndFilter: (x) => uEq(last(x).attrib, 'acl') })
          .some(
            (x) =>
              x.end.node.interp.isAdverb() && x.end.node.interp.isRelative(),
          ),
    )

    // ereportIf(`відносний ADV в acl’і без ref`, a =>
    //   // uEq(a.attrib, 'acl')
    //   a.end.node.interp.isAdverb()
    //   && a.end.node.interp.isRelative()
    //   && !a.end.walkBackWidth()
    //     .filter(x => uEq(x.attrib, 'acl'))
    //     .some(x => x.start.outgoingArrows.some(xx => xx.attrib === 'rel' && xx.end === a.end))
    // )

    xreportIf(
      `відносний _що_ у acl:relfull`,
      (t) =>
        t.data.form === 'що' &&
        !uEqSome(t.data.rel, ['obl']) &&
        t.data.interp.isRelative() &&
        wiith(
          g.findRelativeClauseRoot(t),
          (relclRoot) => relclRoot && relclRoot.data.rel === 'acl:relfull',
        ),
    )

    reportIf(
      `acl:relless не має назаднього nsubj/obj`,
      (t) =>
        t.data.rel === 'acl:relless' &&
        !enhancedOnlyNodes[t.data.index].outgoingArrows.some(
          (x) =>
            x.end.node.index === t.parent.data.index &&
            uEqSome(x.attrib, ['obj', 'nsubj']),
        ),
    )

    reportIf(
      `acl:relpers без ref`,
      (t) =>
        t.data.rel === 'acl:relpers' &&
        !enhancedOnlyNodes[t.parent.data.index].outgoingArrows.some(
          (x) => x.attrib === 'ref',
        ),
    )

    reportIf(
      `відносний в нерозрізненому acl’і`,
      (t) =>
        t.data.interp.isRelative() &&
        !t.data.interp.isAdverb() &&
        wiith(
          g.findRelativeClauseRoot(t),
          (relclRoot) => relclRoot && relclRoot.data.rel === 'acl',
        ),
    )

    reportIf(`відносний в acl:irrel`, (t) =>
      wiith(
        g.findRelativeClauseRoot(t),
        (relclRoot) => relclRoot && relclRoot.data.rel === 'acl:irrel',
      ),
    )

    if (0) {
      let relRoots = nodes
        .filter((x) => x.data.interp.isRelative())
        .map((x) => g.findRelativeClauseRoot(x))
      relRoots
        .filter((x, i) => relRoots.find((xx, ii) => ii !== i && xx === x))
        .forEach((x) =>
          problems.push({
            indexes: [x.data.index],
            message: `не єдиний відносний`,
          }),
        )
    }

    reportIf(
      `ccomp в інфінітив без #inf-ccomp`,
      (t) =>
        uEq(t.data.rel, 'ccomp') &&
        g.isInfinitiveAnalytically(t) &&
        !t.data.hasTag('inf-ccomp'),
    )

    xreportIf(`#inf-ccomp`, (t) => t.data.hasTag('inf-ccomp'))

    // todo: через advcl? https://lab.mova.institute/brat/#/ud/zvidusil__27/23?focus=T24
    // todo: кожі до xcomp’ів https://lab.mova.institute/brat/#/ud/zvidusil__26/76?focus=T21
    // todo: go transclausal? https://github.com/UniversalDependencies/docs/issues/568
    // todo: nsubj sp в rel а не далекий підмет
    // todo: acl-amod’и

    reportIf(
      `неочікуваний #xsubj-from-head`,
      (t) =>
        t.data.hasTag('xsubj-from-head') &&
        ((t.data.rel !== 'xcomp' && t.data.rel !== 'xcomp:pred') ||
          t.parent.children.some((x) => uEqSome(x.data.rel, g.SUBJECTS))), // todo: conj
    )
    reportIf(
      `неочікуваний #xsubj-is-phantom-iobj`,
      (t) =>
        t.data.hasTag('xsubj-is-phantom-iobj') && // todo: rename
        (t.data.rel !== 'xcomp' ||
          t.parent.children.some((x) => uEqSome(x.data.rel, ['obj', 'iobj']))), // todo: conj
    )
    reportIf(
      `неочікуваний #xsubj-is-obl`,
      (t) =>
        t.data.hasTag('xsubj-is-obl') && // todo: rename
        (t.data.rel !== 'xcomp' ||
          !t.parent.children.some((x) => uEqSome(x.data.rel, ['obl']))), // todo: conj
    )

    // todo: це — дірки
    reportIf(
      `xcomp без enhanced підмета`,
      (t) =>
        t.data.rel === 'xcomp' &&
        !t.data.hasTag('xsubj-from-head') &&
        !t.data.hasTag('xsubj-is-phantom-iobj') &&
        !t.data.hasTag('xsubj-is-obl') &&
        !t.parent.data.interp.isConverb() &&
        !enhancedOnlyNodes[t.data.index].outgoingArrows.some((x) =>
          uEqSome(x.attrib, ['nsubj:x']),
        ),
      // && !t.parent.node.interp.isReversive()  // temp
    )

    reportIf(
      `xcomp:pred без enhanced підмета`,
      (t) =>
        t.data.rel === 'xcomp:pred' &&
        !t.data.hasTag('xsubj-from-head') &&
        !enhancedOnlyNodes[t.data.index].outgoingArrows.some((x) =>
          uEqSome(x.attrib, ['nsubj:pred']),
        ) &&
        !t.parent.data.interp.isConverb(),
    )

    reportIf(
      `advcl:pred без enhanced підмета`,
      (t) =>
        t.data.rel === 'advcl:pred' &&
        !enhancedOnlyNodes[t.data.index].outgoingArrows.some((x) =>
          uEqSome(x.attrib, ['nsubj:pred']),
        ) &&
        !t.data.hasTag('xsubj-from-head'),
    )

    reportIf(`емфатичний займенник (забули розбити?)`, (t) =>
      t.data.interp.isEmphatic(),
    )

    xreportIf(
      `flat має неочікувані залежники`,
      (t) =>
        t.parent &&
        !t.parent.data.isGraft &&
        uEq(t.parent.data.rel, 'flat') &&
        // && t.parent.node.rel !== 'flat:sibl'
        // && !uEqSome(t.node.rel, ['conj', 'flat', 'punct'])
        uEqSome(t.data.rel, g.CLAUSE_RELS),
    )

    xreportIf(
      `виразова реляція в безпре`,
      (t) =>
        uEqSome(t.data.rel, g.CLAUSAL_MODIFIERS) &&
        !g.hasPredication(t) &&
        !g.isInfinitiveAnalytically(t) &&
        !t.data.rel.endsWith(':pred'),
    )

    xreportIf(
      `expl без підмета`,
      (t) =>
        uEqSome(t.data.rel, ['expl']) &&
        !t.parent.children.some((x) => uEqSome(x.data.rel, g.SUBJECTS)),
    )

    reportIf(
      `підмет з інфінітива`,
      (t) =>
        uEqSome(t.data.rel, g.SUBJECTS) && g.isInfinitiveAnalytically(t.parent),
    )

    xreportIf(
      `можливо пропущений присудок`,
      (t) =>
        !t.isRoot() &&
        /^[\-–—]+$/.test(t.data.getForm()) &&
        !t.parent.data.interp.isBeforeadj() &&
        !uEqSome(t.parent.data.rel, ['appos', 'parataxis', 'compound']) &&
        t.parent.data.rel !== 'flat:repeat' &&
        t.parent.data.rel !== 'flat:title' &&
        t.parent.data.rel !== 'flat:range' &&
        t.parent.data.rel !== 'flat:name' &&
        t.parent.data.rel !== 'conj:repeat' &&
        t.data.index &&
        !nodes[t.data.index - 1].data.isElided() &&
        !(
          g.hasChild(t.parent, 'nsubj') &&
          (t.parent.data.interp.isNounish() ||
            t.parent.data.interp.isAdjective())
        ) &&
        !(
          g.hasChild(t.parent, 'csubj') &&
          (t.parent.data.interp.isNounish() ||
            t.parent.data.interp.isAdjective())
        ) &&
        !(
          t.parent.data.interp.lemma === 'пів' &&
          t.parent.data.interp.isCardinalNumeral()
        ) &&
        !(
          ['бо', 'но', 'то', 'от', 'таки'].includes(
            t.parent.data.interp.lemma,
          ) && t.parent.data.interp.isParticle()
        ),
    )

    xreportIf(`list`, (t) => uEq(t.data.rel, 'list'))

    reportIf(
      `M-dash без типу`,
      (t) =>
        t.data.interp.isPunctuation() &&
        /^[—]+$/.test(t.data.getForm()) &&
        !t.data.interp.hasFeature(f.PunctuationType),
    )
    reportIf(
      `N-dash без типу`,
      (t) =>
        t.data.interp.isPunctuation() &&
        /^[–]+$/.test(t.data.getForm()) &&
        !t.data.interp.hasFeature(f.PunctuationType),
    )
    reportIf(
      `hyphen без типу`,
      (t) =>
        t.data.interp.isPunctuation() &&
        /^[\-]+$/.test(t.data.getForm()) &&
        !t.data.interp.hasFeature(f.PunctuationType),
    )
    reportIf(
      `мінус без типу`,
      (t) =>
        t.data.interp.isPunctuation() &&
        /^[−]+$/.test(t.data.getForm()) &&
        !t.data.interp.hasFeature(f.PunctuationType),
    )
    reportIf(
      `${g.SOME_QUOTES.source} без типу`,
      (t) =>
        t.data.interp.isPunctuation() &&
        g.SOME_QUOTES.test(t.data.getForm()) &&
        !t.data.interp.hasFeature(f.PunctuationType),
    )

    xreportIf(
      `_ csubj з прислівника`,
      (t) => uEqSome(t.data.rel, ['csubj']) && t.parent.data.interp.isAdverb(),
    )
    xreportIf(
      `_ nsubj з прислівника`,
      (t) => uEqSome(t.data.rel, ['nsubj']) && t.parent.data.interp.isAdverb(),
    )
    reportIf(
      `ccomp з прислівника`,
      (t) => uEqSome(t.data.rel, ['ccomp']) && t.parent.data.interp.isAdverb(),
    )
    reportIf(
      `xcomp з прислівника`,
      (t) => uEqSome(t.data.rel, ['xcomp']) && t.parent.data.interp.isAdverb(),
    )
    xreportIf(
      `_ ccomp з прислівника без #subjless-predication`,
      (t) => uEqSome(t.data.rel, ['ccomp']) && t.parent.data.interp.isAdverb(),
      // && t.node.hasTag('subjless-predication')
    )
    xreportIf(
      `_ nsubj -лося`,
      (t) =>
        uEqSome(t.data.rel, ['nsubj']) &&
        t.parent.data.interp.isVerb() &&
        /лос[ья]$/.test(t.parent.data.getForm()),
    )
    xreportIf(
      `_ csubj -лося`,
      (t) =>
        uEqSome(t.data.rel, ['csubj']) &&
        t.parent.data.interp.isVerb() &&
        /лос[ья]$/.test(t.parent.data.getForm()),
    )
    xreportIf(
      `_ давальний додаток у прислівника з підметом`,
      (t) =>
        uEqSome(t.data.rel, ['obj', 'iobj']) &&
        t.data.interp.isDative() &&
        t.parent.data.interp.isAdverb() &&
        t.parent.children.some((x) => uEqSome(x.data.rel, g.SUBJECTS)),
    )

    reportIf(
      `розділовий у fixed’і`,
      (t) => uEqSome(t.data.rel, ['fixed']) && t.data.interp.isPunctuation(),
    )

    reportIf(
      `goeswith без пробіла поперед`,
      (t) =>
        uEqSome(t.data.rel, ['goeswith']) &&
        nodes[t.data.index - 1].data.gluedNext,
    )
    // reportIf(`relative clause не фінітний`, t =>
    //   g.isRelativeSpecificAcl(t.node.rel)
    // )

    // test сам >>~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    xreportIf(
      `сам obl`,
      (t) => t.data.interp.lemma === 'сам' && uEq(t.data.rel, 'obl'),
    )
    xreportIf(
      `сам det`,
      (t) => t.data.interp.lemma === 'сам' && uEq(t.data.rel, 'det'),
    )
    xreportIf(
      `сам nsubj`,
      (t) => t.data.interp.lemma === 'сам' && uEq(t.data.rel, 'nsubj'),
    )
    xreportIf(
      `сам advcl:pred`,
      (t) => t.data.interp.lemma === 'сам' && uEq(t.data.rel, 'advcl:pred'),
    )
    xreportIf(
      `сам ?`,
      (t) =>
        t.data.interp.lemma === 'сам' &&
        !uEqSome(t.data.rel, [
          'obl',
          'det',
          'nsubj',
          'advcl',
          'parataxis',
          'conj',
        ]) &&
        !t.isRoot(),
    )
    xreportIf(
      `самий obl`,
      (t) => t.data.interp.lemma === 'самий' && uEq(t.data.rel, 'obl'),
    )
    xreportIf(
      `самий det`,
      (t) => t.data.interp.lemma === 'самий' && uEq(t.data.rel, 'det'),
    )
    xreportIf(
      `самий nsubj`,
      (t) => t.data.interp.lemma === 'самий' && uEq(t.data.rel, 'nsubj'),
    )
    xreportIf(
      `самий advcl:pred`,
      (t) => t.data.interp.lemma === 'самий' && uEq(t.data.rel, 'advcl:pred'),
    )
    xreportIf(
      `самий ?`,
      (t) =>
        t.data.interp.lemma === 'самий' &&
        !uEqSome(t.data.rel, [
          'obl',
          'det',
          'nsubj',
          'advcl',
          'parataxis',
          'conj',
        ]) &&
        !t.isRoot(),
    )

    xreportIf(`сусіди obl’и`, (t) =>
      wiithNonempty(
        g.findNeighbourAncestor(nodes, t.data.index, 'obl'),
        (it) => it.parent !== t.parent,
      ),
    )

    reportIf(
      `неочікуваний розбір типу _разом з_`,
      (t) =>
        t.data.interp.isAdverb() &&
        ['разом'].includes(t.data.interp.lemma) &&
        t.data.index < nodes.length &&
        nodes[t.data.index + 1].data.interp.isPreposition() &&
        !wiith(
          nodes[t.data.index + 1],
          (next) => next.parent && next.parent.parent === t,
        ),
    )

    reportIf(
      `неочікуваний розбір _все одно_`,
      (t) =>
        ['одно', 'рівно'].includes(t.data.interp.lemma) &&
        t.data.index > 0 &&
        t.data.index < nodes.length &&
        ['все', 'усе'].includes(nodes[t.data.index - 1].data.interp.lemma) &&
        !(uEq(t.data.rel, 'fixed') && t.parent === nodes[t.data.index - 1]),
      // todo: все-іменник
    )

    reportIf(
      `розбір позначено сумнівним`,
      (t) => t.data.comment && t.data.comment.includes('~'),
    )

    // trash >>~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    if (0) {
      xoldReportIf(
        `:pass-реляція?`,
        (t) =>
          !t.isPromoted &&
          ['aux', 'csubj', 'nsubj'].includes(t.rel) &&
          tokens[t.headIndex] &&
          isPassive(tokens[t.headIndex].interp),
      ) // todo: навпаки
      xoldReportIf(
        `:obl:agent?`,
        (t, i) =>
          !t.isPromoted &&
          t.rel === 'obl' &&
          t.interp.isInstrumental() &&
          isPassive(tokens[t.headIndex].interp) &&
          !hasDependantWhich(i, (xx) => uEq(xx.rel, 'case')),
      )
      xreportIf(
        `flat:range?`,
        (t) =>
          uEqSome(t.data.rel, ['conj']) &&
          t.children.some(
            (x) => /[-–—]/.test(x.data.form) && x.data.index < t.data.index,
          ),
      )
      xreportIf2(
        `_test: тераса за терасою`,
        ({ i, r }) => !uEq(r, 'nsubj') && i.isNominative(),
      )
      xreportIf(
        `немає`,
        (t) =>
          g.isNemaje(t.data.interp) &&
          findMultitoken(t.data.index, multitokens),
      )
      xreportIf(
        `:relfull має сполучник`,
        (t) => t.data.rel === 'acl:relfull' && g.hasChild(t, 'mark'),
      )
      xreportIf(
        `:relfull без Rel`,
        (t) =>
          t.data.rel === 'acl:relfull' &&
          !nodes.some((x) => g.findRelativeClauseRoot(x) === t) &&
          !t.data.isElided(), // temp
      )
      {
        let cutoff = [
          /* ...g.SUBORDINATE_CLAUSES, */ 'parataxis' /* , 'conj' */,
        ]
        xreportIf(
          `не єдиний відносний в acl:relfull`,
          (t) =>
            t.data.rel === 'acl:relfull' &&
            mu(walkDepthNoSelf(t, (x) => uEqSome(x.data.rel, cutoff)))
              .filter(
                (x) => x.data.interp.isRelative(),
                // з ким і про що розмовляє президент
                // && !(uEq(x.node.rel, 'conj') && x.parent.node.interp.isRelative())
              )
              .unique() // shared-private paths
              .longerThan(1),
        )
      }
    }
    // <<~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  }

  // **********

  // parataxis:discourse з підрядного: розуміється, що
  // одиним зі способів — узгодження родів
  // нумерація типу 1)
  // давальний з інфінітива
  // так ніби
  // сама до себе теж flat:abs
  // такий, як
  // що ref йде з кореня NP
  //   їхнім настоятелям - отцям Юрію ( Кав'юку ) та Івану ( Марковському ) , без яких ця поїздка була б
  // якщо shared підмет embedded в дієслові — все одно conj: Йшли - йшли , дійшли до лісу
  // не було чого пообідать — acl через місточок
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
  //   flat:sibl
  // xcomp з нема
  // punct-nonproj має сенс
  // goeswith не йде в _пів_
  // flat:sibl не з conj
  // flat:sibl не з nummod etc
  // посунути пропуски _до_ риски
  // найкращий за всю історію — що з найкращий
  // по-третє discourse
  // близько 830 осіб — з нумерала
  // cop з flat:sibl
  // один одного :abs has PronType=
  // Час від часу — перший час називний
  // так само
  // lemmas for punct types
  // зробили реконструкцію, але забули зробити орфанами obl’и
  // conj:upperlevel з conj
  // словник xcomp:pred
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
  // злидні кинулись всі до дерева — всі advcl:pred чи просто det?
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
  // вказують як синонім — xcomp:pred
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
  // давальний самому — advcl:pred чи таки iobj?
  // obl чи advcl в inf_prep?
  // коми в складених присудках
  // закривні розділові зі своїх боків
  // будь ласка
  // стала роллю — щоб не obj замість xcomp:pred
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

function findMultitoken(
  tokenIndex: number,
  multitokens: Array<MultitokenDescriptor>,
) {
  let ret = multitokens.find(
    (x) =>
      x.startIndex <= tokenIndex && x.startIndex + x.spanLength > tokenIndex,
  )
  // console.error(tokenIndex, multitokens)
  return ret
}

function hasChildrenOfUrel(node: GraphNode<Token>, urel: string) {
  return node.children.some((x) => uEq(x.data.rel, urel))
}

function thisOrConj(node: GraphNode<Token>, predicate: TreedSentencePredicate) {
  let nodes = [node]
  if (uEq(node.data.rel, 'conj')) {
    nodes.push(node.parent)
  }
  for (let x of nodes) {
    if (predicate(x)) {
      return true
    }
  }
  return false
}

function isSubordiateRoot(token: Token) {
  return g.SUBORDINATE_CLAUSES.some((x) => uEq(token.rel, x))
}

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

function isContentWord(token: Token) {
  if (token.isPromoted) {
    return true
  }
  // const CONTENT_WORD_POSES = [Pos.adjective, Pos.adverb, Pos.]
  const FUNCTION_WORD_POSES = [f.Pos.conjunction, f.Pos.particle, f.Pos.punct]
  return (
    !FUNCTION_WORD_POSES.includes(token.interp.features.pos) &&
    !token.interp.isAuxillary()
  )
}

function isPassive(interp: MorphInterp) {
  return /*interp.isImpersonal() ||*/ interp.isPassive()
}

function isContinuous(array: Array<number>) {
  for (let i = 1; i < array.length; ++i) {
    if (array[i] - array[i - 1] !== 1) {
      return false
    }
  }
  return true
}

function canBePredicate(t: GraphNode<Token>) {
  let token = t.data
  let { interp } = token
  return (
    t.isRoot() ||
    uEq(token.rel, 'parataxis') ||
    interp.isXForeign() ||
    interp.isVerbial() ||
    // || interp.isAdverb()
    g.hasChild(t, 'nsubj') ||
    g.hasChild(t, 'csubj') ||
    g.hasChild(t, 'cop')
  )
  // || (t.children.some(x => uEq(x.node.rel, 'cop'))
  //   && (interp.isNounish() || interp.isAdjective())
  //   && (interp.isNominative() || interp.isInstrumental() || interp.isLocative())
  // )
  // || ((interp.isNounish() || interp.isAdjective()) && interp.isNominative())
}

function canBePredicateOld(
  token: Token,
  sentence: Array<Token>,
  index: number,
) {
  return (
    !token.hasDeps() ||
    uEq(token.rel, 'parataxis') ||
    token.interp.isInterjection() ||
    token.interp.isVerb() ||
    token.interp.isConverb() ||
    token.interp.isAdverb() ||
    (sentence.some((t) => t.headIndex === index && uEq(t.rel, 'cop')) &&
      (token.interp.isNounish() || token.interp.isAdjective()) &&
      (token.interp.isNominative() ||
        token.interp.isInstrumental() ||
        token.interp.isLocative())) ||
    ((token.interp.isNounish() || token.interp.isAdjective()) &&
      token.interp.isNominative()) ||
    g.CLAUSAL_MODIFIERS.includes(token.rel)
  )
}

function canActAsNoun(node: GraphNode<Token>) {
  return (
    node.data.interp.isNounish() ||
    (node.data.isPromoted &&
      (node.data.interp.isAdjectivish() ||
        node.data.interp.isCardinalNumeral())) ||
    node.data.hasTag('graft') ||
    node.data.interp.isXForeign() ||
    node.data.interp.isSymbol()
  )
}

function canTheoreticallyActAsNoun(node: GraphNode<Token>) {
  return node.data.interp.isAdjectivish() // && !node.hasChildren()
}

function canActAsNounForObj(node: GraphNode<Token>) {
  return (
    canActAsNoun(node) ||
    (!node.isRoot() &&
      node.data.interp.isRelative() &&
      g.thisOrConjHead(node, (n) => isSubordiateRoot(n.parent.node))) ||
    (node.data.interp.lemma === 'той' && node.data.interp.isDemonstrative()) ||
    (node.data.interp.isAdjective() &&
      node.data.interp.isPronominal() &&
      ['один'].includes(node.data.interp.lemma) &&
      node.children.some((x) => x.data.rel === 'flat:abs'))
  )
}

function isEncolsedInQuotes(node: GraphNode<Token>) {
  let ret =
    node.children.length > 2 &&
    node.children[0].data.interp.isQuote() &&
    last(node.children).data.interp.isQuote()

  return ret
}
