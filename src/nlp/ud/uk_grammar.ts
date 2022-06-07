import { GraphNode, walkDepthNoSelf, walkDepth } from '../../graph'
import { Token, Dependency, TokenTag } from '../token'
import { MorphInterp } from '../morph_interp'
import { uEq, uEqSome, stripSubrel } from './utils'
import { mu } from '../../mu'
import { last, wiith } from '../../lang'
import { UdPos, toUd } from './tagset'
import { ValencyDict } from '../valency_dictionary/valency_dictionary'
import { compareAscending, clusterize } from '../../algo'
import { DirectedGraphNode, Arrow } from '../../directed_graph'
import * as f from '../morph_features'
import { buildEnhancedTreeFromBasic, loadEnhancedGraphFromTokens } from './enhanced'



////////////////////////////////////////////////////////////////////////////////
export type TokenNode = GraphNode<Token>
export type EnhancedNode = DirectedGraphNode<Token, string>
export type EnhancedArrow = Arrow<Token, string>
export type Node2indexMap = Map<TokenNode, number>

////////////////////////////////////////////////////////////////////////////////
export function isAmbigCoordModifier(node: GraphNode<Token>) {
  return node.parent
    && node.parent.children.some(x => uEq(x.node.rel, 'conj')
      && !x.node.rel.endsWith(':parataxis'))
    && !uEqSome(node.node.rel, [
      'conj',
      'cc',
      'sconj',
      'mark',
      'punct',
      'xcomp',
      'appos',
      'parataxis',
      'flat',
      'compound',
    ])
    && !(uEq(node.node.rel, 'discourse') && (node.node.interp.isConsequential()
      || node.node.interp.lemma === 'тощо')
    )
    // && uEqSome(node.node.rel, ['nsubj'])
    // && wiithNonempty(node.children.find(x => uEq(x.node.rel, 'conj')), x => x.children.some(xx => uEqSome(xx.node.rel, ['nsubj'])))
    && !node.node.hdeps.some(xx => uEqSome(xx.relation, CONJ_PROPAGATION_RELS_ARR))
}

////////////////////////////////////////////////////////////////////////////////
export function isFeasibleRelclWithoutRel(node: TokenNode) {
  return uEq(node.node.rel, 'acl')
    && node.children.some(x => uEq(x.node.rel, 'mark') && x.node.interp.lemma === 'що')
  // && !node.children.some(x => uEqSome(x.node.rel, [/* 'obj', 'iobj', */ 'nsubj', 'csubj']))
  // && !node.node.interp.isImpersonal()  // todo: why autofix doesn't pick this from agreement?
  // && nsubjAgreesWithPredicate(node.parent, node)
}

////////////////////////////////////////////////////////////////////////////////
export function nsubjAgreesWithPredicate(noun: TokenNode, predicate: TokenNode) {
  if (noun.node.interp.isX() || noun.node.isGraft) {
    return true
  }

  let verbInterp = predicate.node.interp
  if (verbInterp.isInfinitive() || !predicate.node.interp.isVerb()) {
    let aux = predicate.children.find(x => uEqSome(x.node.rel, ['aux', 'cop']))
    if (aux) {
      verbInterp = aux.node.interp
    }
  }

  if (verbInterp.isInstant()) {
    return true
  }

  if (verbInterp.hasFeature(f.Person)
    && verbInterp.getFeature(f.Person) !== f.Person.third
    && !verbInterp.equalsByFeature(noun.node.interp, f.Person)
  ) {
    return false
  }

  if (verbInterp.hasGender()
    && !isValidGenderlesNoun(noun)
    // && !(noun.node.interp.isPronominal() && !noun.node.interp.hasFeature(f.Gender))
    && !verbInterp.equalsByFeature(noun.node.interp, f.Gender)
  ) {
    return false
  }

  if (!verbInterp.equalsByFeature(noun.node.interp, f.MorphNumber)
    && (noun.node.interp.hasGender() || noun.node.interp.hasNumber())
    && !(verbInterp.isPlural()
      && noun.children.some(x => uEq(x.node.rel, 'conj') || isConjlikeNmod(x))
    )
    && !(verbInterp.isPlural()
      && noun.children.some(x => isGoverning(x.node.rel) && x.node.interp.isPlural()
        || x.node.rel === 'advmod:amtgov'
      )
    )
  ) {
    return false
  }

  return true
}

////////////////////////////////////////////////////////////////////////////////
export function isNemaje(interp: MorphInterp) {
  return ['немати', 'ні'].includes(interp.lemma) && interp.isVerb()
}

////////////////////////////////////////////////////////////////////////////////
export function isConjlikeNmod(node: TokenNode) {
  return uEq(node.node.rel, 'nmod')
    && node.node.interp.isInstrumental()
    && node.children.some(x => uEq(x.node.rel, 'case')
      && ['з', 'зі', 'із'].includes(x.node.interp.lemma)
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isValidGenderlesNoun(node: TokenNode) {
  return node.node.interp.isPronominal()
    && ['хтось', 'ніхто', 'я', 'ти'].includes(node.node.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export function isPromoted(node: TokenNode) {
  return !node.node.isElided() && node.parents.some(p => p.node.isElided())
}

////////////////////////////////////////////////////////////////////////////////
export function isNonprojective(node: TokenNode) {
  let indexes = mu(walkDepth(node))
    .map(x => x.node.index)
    .toArray()
    .sort(compareAscending)

  for (let i = 1; i < indexes.length; ++i) {
    if (indexes[i] - indexes[i - 1] !== 1) {
      return true
    }
  }

  return false
}

////////////////////////////////////////////////////////////////////////////////
export function isSecondaryPredication(rel: string) {
  return rel === 'advcl:sp' || rel === 'xcomp:sp'
}

////////////////////////////////////////////////////////////////////////////////
export function findRelationAnalog(newDependent: TokenNode, existingDependent: TokenNode) {
  let { pos: newDepPos } = toUd(newDependent.node.interp)
  let { pos: existingDepPos } = toUd(existingDependent.node.interp)
  let existingRel = existingDependent.node.rel
  newDepPos = dumbDownUdPos(newDepPos)
  existingDepPos = dumbDownUdPos(existingDepPos)


  if (newDependent.node.interp.isX()) {
    // what else can we do?..
    return existingRel
  }

  if (uEqSome(existingRel, [
    'cop',
    'aux',
    'mark',
    'case',
    'dep',
    'cc',
    'vocative',
    'xcomp',  // ~
    'appos',  // ~
  ])) {
    return existingRel
  }

  if (uEq(existingRel, 'obl') && newDependent.node.interp.isAdverb()) {
    // todo: виколоти і т.д.
    return 'advmod'
  }
  if (uEq(existingRel, 'advmod') && newDependent.node.interp.isNounish()) {
    // todo: то там, то сям, то те, то се; скрізь і всім допомагати
    return 'obl'
  }
  if (uEq(existingRel, 'amod') && newDepPos === 'DET') {
    return 'det'
  }
  if (uEqSome(existingRel, ['amod', 'det']) && newDependent.node.interp.isNounish()) {
    return 'nmod'
  }
  if (uEq(existingRel, 'det') && newDepPos === 'ADJ') {
    return 'amod'
  }

  if (uEqSome(existingRel, CLAUSAL_MODIFIERS) && definitelyIsPredicate(newDependent)) {
    return existingRel
  }

  if (uEq(existingRel, 'advcl')
    && existingDependent.node.interp.isConverb()
    && newDependent.node.interp.isAdjective()
  ) {
    return 'advcl:sp'
  }

  for (let [clausal, plain] of CLAUSAL_TO_PLAIN) {
    if (uEq(existingRel, clausal)
      && !definitelyIsPredicate(newDependent)
      && !newDependent.node.interp.isVerbial()
    ) {
      // return plain
    }
    if (uEq(existingRel, plain) && definitelyIsPredicate(newDependent)) {
      // return clausal
    }
  }

  if (newDepPos === existingDepPos) {
    return existingRel  // risky
  }

  return existingRel  // last resort

  // todo: state it doesn't work without gap filling
  // todo: хто і як слухатиме його
}

//------------------------------------------------------------------------------
function definitelyIsPredicate(node: TokenNode) {
  return hasChild(node, 'nsubj')
    || hasChild(node, 'csubj')
    || hasChild(node, 'cop')
}

//------------------------------------------------------------------------------
function dumbDownUdPos(upos: UdPos) {
  if (upos === 'PROPN' || upos === 'PRON') {
    return 'NOUN'
  }
  return upos
}

////////////////////////////////////////////////////////////////////////////////
export function findXcompSubject(node: TokenNode) {
  let topParent = node.ancestors0().find(x =>
    !uEqSome(x.node.rel, ['xcomp', 'conj', 'parataxis'])/*  || x.node.rel === 'conj:parataxis' */)

  return mu(['obj', 'iobj', 'nsubj', 'csubj'])
    .map(r => topParent.children.find(x => uEq(x.node.rel, r)))
    .filter(x => x)
    .first()
}

////////////////////////////////////////////////////////////////////////////////
export function isRootOrHole(node: TokenNode) {
  return !node.node.deps.some(x => !uEq(x.relation, 'orphan'))
  // || !node.parents.every(x => hasChild(x, 'orphan')
  //   && !x.parents.some(xx => xx.node.isElided()))
}

////////////////////////////////////////////////////////////////////////////////
export function calcNumRoots(nodes: Iterable<TokenNode>) {
  return mu(nodes).count(isRootOrHole)
}

////////////////////////////////////////////////////////////////////////////////
export function isCompleteSentence(nodes: Iterable<TokenNode>) {
  return calcNumRoots(nodes) === 1
}

////////////////////////////////////////////////////////////////////////////////
export function findClauseRoot(node: TokenNode) {
  return mu(node.walkThisAndUp0())
    .find(x => uEqSome(x.node.rel, CLAUSE_RELS))
}

////////////////////////////////////////////////////////////////////////////////
export function findClauseArrows(node: EnhancedNode) {
  return node.walkBackWidth()
    .filter(x => uEqSome(x.attrib, CLAUSE_RELS))
}

////////////////////////////////////////////////////////////////////////////////
export function findRelativeClauseRootsEnh(relative: EnhancedNode) {
  return findClauseArrows(relative)
    .filter(a => uEq(a.attrib, 'acl'))
}

////////////////////////////////////////////////////////////////////////////////
export function findRelativeClauseRoot(relative: TokenNode) {
  if (!relative.node.interp.isRelative()) {
    return
  }
  let clauseRoot = findClauseRoot(relative)
  if (!clauseRoot) {
    return
  }
  if (uEq(clauseRoot.node.rel, 'acl')) {
    return clauseRoot
  }

  if (clauseRoot.node.interp.isInfinitive()) {
    clauseRoot = mu(clauseRoot.walkUp0())
      .find(x => uEqSome(x.node.rel, CLAUSE_RELS))
  }

  if (clauseRoot && uEq(clauseRoot.node.rel, 'acl')) {
    return clauseRoot
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isRelclByRef(aclArrow: EnhancedArrow) {
  if (!uEq(aclArrow.attrib, 'acl')) {
    return false
  }

  let relativesFromStart = aclArrow.start.outgoingArrows
    .filter(x => x.attrib === 'ref')
    .map(x => x.end)

  return aclArrow.end.walkForwardWidth()
    .some(arrow => relativesFromStart.includes(arrow.end))
}

////////////////////////////////////////////////////////////////////////////////
export function findShchojijiAntecedent(node: TokenNode) {
  if (!node.node.interp.isPersonal() || !node.node.interp.isNounish()) {
    return
  }
  let clauseRoot = findRelativeClauseRoot(node)
  if (!clauseRoot) {
    return
  }
  if (clauseRoot.parent
    && clauseRoot.children.some(x => x.node.interp.lemma === 'що' && uEq(x.node.rel, 'mark'))
    && clauseRoot.parent.node.interp.equalsByFeatures(node.node.interp, [f.MorphNumber, f.Gender])
  ) {
    return clauseRoot.parent
  }
}

////////////////////////////////////////////////////////////////////////////////
// foofil
export function findNeighbourAncestor(
  sentence: Array<TokenNode>,
  focusIndex: number,
  rel: string,
) {
  for (let i = focusIndex + 1; i < sentence.length; ++i) {
    let t = sentence[i]
    if (t.node.interp.isPunctuation()) {
      continue
    }
    if (t.ancestors0().some(x => x === t)) {
      continue
    }

    return t.ancestors0().find(x => uEqSome(x.node.rel, [rel]))
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isDativeValencyAdjective(t: Token) {
  return t.interp.isAdjective() && (
    DAT_VALENCY_ADJECTIVES.has(t.interp.lemma)
    || DAT_VALENCY_ADJECTIVES.has('не' + t.interp.lemma)
  )
}

////////////////////////////////////////////////////////////////////////////////
export function isValencyHavingAdjective(t: Token) {
  return t.interp.isAdjective()
    && (
      DAT_VALENCY_ADJECTIVES.has(t.interp.lemma)
      || GEN_VALENCY_ADJECTIVES.has(t.interp.lemma)
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isInfValencyAdjective(t: Token) {
  return t.interp.isAdjective()
    && INF_VALENCY_ADJECTIVES.includes(t.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export const PREDICATES = {
  isAuxWithNoCopAux(t: TokenNode) {
    return t.node.interp.isAuxillary()
      && t.parent
      && !['cop', 'aux'].some(x => uEq(t.node.rel, x))
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isNumericModifier(rel: string) {
  return uEq(rel, 'nummod') || rel === 'det:nummod' || rel === 'det:numgov'
}

////////////////////////////////////////////////////////////////////////////////
export function isGoverning(relation: string) {
  return relation === 'nummod:gov' || relation === 'det:numgov'
}

////////////////////////////////////////////////////////////////////////////////
export function isNumeralModified(t: TokenNode) {
  return t.children.some(x => isNumericModifier(x.node.rel))
    || isQuantitativeAdverbModified(t)
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantitativeAdverbModified(t: TokenNode) {
  return t.children.some(x => isQuantitativeAdverbModifier(x))
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantitativeAdverbModifier(t: TokenNode) {
  return t.node.rel === 'advmod:amtgov'// && t.parent.node.interp.isGenitive()
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantitativeAdverbModifierCandidate(t: TokenNode) {
  return !t.isRoot()
    && t.parent.node.interp.isGenitive()
    && uEq(t.node.rel, 'advmod')
    && QAUNTITATIVE_ADVERBS.includes(t.node.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export function thisOrGovernedCase(t: TokenNode) {
  let governer = t.children.find(x => isGoverning(x.node.rel))
  if (governer) {
    return governer.node.interp.features.case
  }
  return t.node.interp.features.case
}

////////////////////////////////////////////////////////////////////////////////
export function isNmodConj(t: TokenNode) {
  return uEq(t.node.rel, 'nummod')
    && t.node.interp.isInstrumental()
    && t.children.some(x => x.node.interp.isPreposition()
      && ['з', 'із', 'зі'].includes(x.node.interp.lemma)
    )
}

////////////////////////////////////////////////////////////////////////////////
export function hasNmodConj(t: TokenNode) {
  return t.children.some(x => isNmodConj(x))
}

////////////////////////////////////////////////////////////////////////////////
export function isNegativeExistentialPseudosubject(t: TokenNode) {
  return uEq(t.node.rel, 'nsubj')
    && t.node.interp.isGenitive()
    && t.parent.children.some(x => x.node.interp.isNegative())
    && t.parent.node.interp.isNeuter()
    && [...COPULA_LEMMAS, 'існувати', 'мати'].includes(t.parent.node.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export function isQuantificationalNsubj(t: TokenNode) {
  return uEq(t.node.rel, 'nsubj')
    && t.node.interp.isGenitive()
    && (t.parent.node.interp.isAdverb()
      && QAUNTITATIVE_ADVERBS.includes(t.parent.node.interp.lemma)
      || t.parent.node.interp.isCardinalNumeral()
      && t.parent.node.interp.isNominative()
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isPunctInParenthes(t: TokenNode) {
  return t.node.interp.isPunctuation()
    && t.children.length === 2
    && t.children[0].node.form === '('
    && t.children[0].node.interp.isPunctuation()
    && t.children[1].node.form === ')'
    && t.children[1].node.interp.isPunctuation()
}

////////////////////////////////////////////////////////////////////////////////
export function isDenUDen(t: TokenNode) {
  // console.log(t.node.indexInSentence)
  return (t.node.interp.isNounish() || t.node.interp.isAdjective() && t.node.interp.isPronominal())
    // && t.node.interp.isNominative()
    // && t.children.length === 1  // experimental
    && wiith(t.children.filter(x => !x.node.interp.isPunctuation()), c =>
      c.every(x => x.node.index > t.node.index)
      && c.length === 1
      && c.some(x => uEq(x.node.rel, 'nmod')
        // && x.node.indexInSentence > t.node.indexInSentence
        // && x.children.some(xx => uEq(xx.node.rel, 'case'))
        && (x.node.interp.isNounish() || x.node.interp.isAdjective() && x.node.interp.isPronominal())
        && x.node.interp.lemma === t.node.interp.lemma
        && x.node.interp.getFeature(f.Case) !== t.node.interp.getFeature(f.Case)
      )
    )
}

////////////////////////////////////////////////////////////////////////////////
export function nounAdjectiveAgreed(noun: TokenNode, adjective: TokenNode) {
  return thisOrGovernedCase(noun) === adjective.node.interp.getFeature(f.Case)
    && (adjective.node.interp.isPlural() && noun.node.interp.isPlural()
      || noun.node.interp.getFeature(f.Gender) === adjective.node.interp.getFeature(f.Gender)
      || adjective.node.interp.isPlural() && noun.node.interp.isSingular() && hasChild(noun, 'conj')
      || adjective.node.interp.isSingular() && GENDERLESS_PRONOUNS.includes(noun.node.interp.lemma)
    )
}

////////////////////////////////////////////////////////////////////////////////
export function nounNounAgreed(interp1: MorphInterp, interp2: MorphInterp) {
  return interp1.equalsByFeatures(interp2, [f.MorphNumber, f.Gender, f.Case])
}

////////////////////////////////////////////////////////////////////////////////
export function hasCopula(t: TokenNode) {
  return t.children.some(x => uEqSome(x.node.rel, ['cop']))
}

////////////////////////////////////////////////////////////////////////////////
export function hasChild(t: TokenNode, rel: string) {
  return t.children.some(x => uEqSome(x.node.rel, [rel]))
}

////////////////////////////////////////////////////////////////////////////////
export function hasSiblink(t: TokenNode, rel: string) {
  return t.parent && t.parent.children.some(x => x !== t && uEqSome(x.node.rel, [rel]))
}

////////////////////////////////////////////////////////////////////////////////
export function isDeceimalFraction(t: TokenNode) {
  return t.node.interp.isCardinalNumeral()
    && /^\d+$/.test(t.node.form)
    && t.children.some(x => /^\d+$/.test(x.node.form)
      && x.children.length === 1
      && [',', '.'].includes(x.children[0].node.form)
      && x.node.index < t.node.index
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isNegated(t: TokenNode) {
  return t.node.interp.isNegative()
    || t.node.interp.isNegativePron()
    || t.children.some(x => x.node.interp.isNegative()
      || x.node.interp.isAuxillary() && x.children.some(xx => xx.node.interp.isNegative()
      )
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isModalAdv(t: TokenNode) {
  return t.node.interp.isAdverb()
    && SOME_MODAL_ADVS.includes(t.node.interp.lemma)
    && (uEqSome(t.node.rel, SUBORDINATE_CLAUSES)
      || uEqSome(t.node.rel, ['parataxis', 'conj'])
      || t.isRoot()
    )
    && hasChild(t, 'csubj')
}

////////////////////////////////////////////////////////////////////////////////
export function isNumAdvAmbig(lemma: string) {
  if (NUM_ADV_AMBIG.includes(lemma)) {
    return true
  }
  // temp, hypen treatment
  return NUM_ADV_AMBIG.some(x => lemma.startsWith(x) || lemma.endsWith(x))
}

////////////////////////////////////////////////////////////////////////////////
export function isConjWithoutCcOrPunct(t: TokenNode) {
  let ret = uEq(t.node.rel, 'conj')
    && !t.children.some(x => uEqSome(x.node.rel, ['cc'])
      || uEq(x.node.rel, 'punct')
      && /[,;/\\]/.test(x.node.interp.lemma)
      && x.node.index < t.node.index
    )
    && !t.node.hasTag('conj_no_cc')

  if (!ret) {
    return ret
  }

  // last one has
  // let siblingConjes = t.parent.children.filter(x => x !== t && uEq(x.node.rel, 'conj'))
  // if (siblingConjes.length) {
  //   ret = ret && !last(siblingConjes).children
  //     .some(x => uEq(x.node.rel, 'cc'))
  // }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function isCompounSvcCandidate(t: TokenNode) {
  return !t.isRoot()
    && t.node.interp.isVerb()
    && ['давати', 'дати'].includes(t.parent.node.interp.lemma)
    && t.parent.node.interp.getFeature(f.Person) === f.Person.second
    && t.parent.node.interp.isImperative()
    && !t.node.interp.isPast()
}

////////////////////////////////////////////////////////////////////////////////
export function isInfinitive(t: TokenNode) {
  return t.node.interp.isInfinitive()
    && !t.children.some(x => uEqSome(x.node.rel, ['aux', 'cop']) && x.node.interp.isFinite())
}

////////////////////////////////////////////////////////////////////////////////
export function hasInfinitiveCop(t: TokenNode) {
  return t.children.some(x => uEqSome(x.node.rel, ['aux', 'cop']) && x.node.interp.isInfinitive())
}

////////////////////////////////////////////////////////////////////////////////
export function isInfinitiveCop(t: TokenNode) {
  return !t.node.interp.isVerb() && hasInfinitiveCop(t)
}

////////////////////////////////////////////////////////////////////////////////
export function isInfinitiveAnalytically(t: TokenNode) {
  return isInfinitive(t) || isInfinitiveCop(t)
}

////////////////////////////////////////////////////////////////////////////////
export function isFinite(t: TokenNode) {
  return t.node.interp.isVerb() && !t.node.interp.isInfinitive()
    || t.children.some(x => uEqSome(x.node.rel, ['aux', 'cop']) && !x.node.interp.isFinite())
}

////////////////////////////////////////////////////////////////////////////////
export function hasOwnRelative(t: TokenNode) {
  return mu(walkDepthNoSelf(t, x => uEqSome(x.node.rel, SUBORDINATE_CLAUSES)
    || x.node.rel === 'parataxis:rel')
  ).some(x => x.node.interp.isRelative())
}

////////////////////////////////////////////////////////////////////////////////
export function isAdverbialAcl(t: TokenNode) {
  return t.parent
    && t.parent.node.interp.isNounish()
    && !t.parent.children.some(x => uEqSome(x.node.rel, ['cop', 'nsubj']))
    && !uEqSome(t.parent.node.rel, ['obl'])
    && (t.node.interp.isAdverb() && !t.hasChildren()  // двері праворуч
      || t.node.interp.isConverb() && !t.hasChildren()  // бокс лежачи
    )
}

////////////////////////////////////////////////////////////////////////////////
export function canBeDecimalFraction(t: TokenNode) {
  return t.node.interp.isCardinalNumeral()
    && /^\d+$/.test(t.node.interp.lemma)
    && t.children.some(x => x.node.interp.isCardinalNumeral()
      && uEq(x.node.rel, 'compound')
      && x.node.index === t.node.index + 2
      && /^\d+$/.test(x.node.interp.lemma)
      && x.children.length === 1
      && x.children[0].node.index === t.node.index + 1
      && [',', '.'].includes(x.children[0].node.interp.lemma)
      && !x.children[0].hasChildren()
    )
}

////////////////////////////////////////////////////////////////////////////////
export function isAdvmodParticle(t: TokenNode) {
  return t.node.interp.isParticle()
    && ADVMOD_NONADVERBIAL_LEMMAS.includes(t.node.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export function canBeAsSomethingForXcomp2(t: TokenNode) {
  return t.node.interp.isNounish()
    && [f.Case.nominative, f.Case.accusative].includes(t.node.interp.getFeature(f.Case))
    && t.children.some(x => x.node.interp.lemma === 'як'
      && x.node.index < t.node.index
    )
}

////////////////////////////////////////////////////////////////////////////////
export function setTenseIfConverb(interp: MorphInterp, form: string) {
  if (interp.isConverb()) {
    if (/ши(с[ья])?$/.test(form)) {
      interp.features.tense = f.Tense.past
    } else if (/чи(с[ья])?$/.test(form)) {
      interp.features.tense = f.Tense.present
    } else {
      let msg = `Bad ending for converb "${form}"`
      console.error(msg)
      // throw new Error(msg)
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function denormalizeInterp(interp: MorphInterp) {
  if (
    (interp.isVerb() || interp.isAdjective() || interp.isNoun())
    && interp.hasGender()
    && !interp.hasNumber()
  ) {
    interp.setIsSingular()
  }
}

////////////////////////////////////////////////////////////////////////////////
export function standartizeMorphoForUd2_11(interp: MorphInterp, form: string) {
  denormalizeInterp(interp)

  setTenseIfConverb(interp, form)  // redundant?

  // remove adj/numr/participle features from &noun
  if (interp.isAdjectiveAsNoun()) {
    interp.dropFeature(f.Degree)
    interp.dropFeature(f.Voice)
    interp.dropFeature(f.Aspect)
    interp.dropFeature(f.OrdinalNumeral)
  }

  // add base degree if empty
  if (interp.isAdjective() && !interp.hasFeature(f.Degree) && !interp.isPronominal()) {
    // interp.setFeature(f.Degree, f.Degree.positive)
  }

  // drop non-standard features
  interp.dropFeature(f.PrepositionRequirement)
  interp.dropFeature(f.Formality)
  interp.dropFeature(f.VerbReversivity)
  interp.dropFeature(f.PunctuationSide)

  interp.dropFeature(f.Rarity)
  interp.dropFeature(f.Oddness)
  interp.dropFeature(f.Colloquiality)

  if (interp.isForeign()) {
    interp.setFromVesumStr('x:foreign', interp.lemma)
  }

  // we're not sure there's a need for that
  if (interp.getFeature(f.PunctuationType) === f.PunctuationType.ellipsis) {
    interp.dropFeature(f.PunctuationType)
  }

  if (interp.isAdjectiveAsNoun()
    && interp.isPronominal()
    && !(interp.isNeuter() && validPronominalAjectivesAsNouns.has(interp.lemma))
  ) {
    interp.dropAdjectiveAsNounFeatures()
  }

  // todo: bring back
  if ([f.PunctuationType.bullet, f.PunctuationType.hyphen, f.PunctuationType.ndash].includes(interp.getFeature(f.PunctuationType))) {
    interp.setFeature(f.PunctuationType, f.PunctuationType.dash)
  }
}

//------------------------------------------------------------------------------
const validPronominalAjectivesAsNouns = new Set([
  'всяке',
  'інше',
  'усяке',
  'і',
])

////////////////////////////////////////////////////////////////////////////////
export function normalizePunct(deps: Array<Dependency>, sentence: Array<TokenNode>) {
  // leave the rightest punct head only
  let [nonpunts, puncts] = clusterize(
    deps,
    x => uEq(x.relation, 'punct') && !sentence[x.headIndex].node.isElided(),
    [[], []]
  )
  if (puncts.length) {
    puncts.sort((a, b) => b.headIndex - a.headIndex)
    deps = [puncts[0], ...nonpunts]
  }

  return deps
}

////////////////////////////////////////////////////////////////////////////////
export function standartizeSentForUd2_11BeforeEnhGeneration(
  basicNodes: Array<TokenNode>,
) {
  // todo: orphan acl:relcl, 0kfy
  // or kill :relcl?
  let enhancedNodes = buildEnhancedTreeFromBasic(basicNodes)
  loadEnhancedGraphFromTokens(enhancedNodes)
  for (let enode of enhancedNodes) {
    for (let arrow of enode.incomingArrows) {
      if (isRelclByRef(arrow)) {
        enode.node.rel = 'acl:relcl'
      }
    }
  }

  for (let node of basicNodes) {
    let t = node.node

    t.deps = normalizePunct(t.deps, basicNodes)

    if (t.hasTag('iobj-agent')) {  // todo
      t.edeps = t.edeps.filter(x => x.relation !== 'nsubj:x')
    }

    // set :relles to :relcl
    if (t.rel === 'acl:relless') {
      t.rel = 'acl:relcl'
    }

    // set AUX and Cond
    if (uEqSome(t.rel, ['aux', 'cop'])) {
      t.interp.setIsAuxillary()
      if (['б', 'би'].includes(t.interp.lemma)) {
        t.interp.setIsConditional()
      }
    }

    // set the only iobj to obj
    if (uEq(t.rel, 'iobj')
      && !node.parent.children.some(x => uEqSome(x.node.rel, CORE_COMPLEMENTS))
    ) {
      // t.rel = changeUniversal(t.rel, 'obj')
      t.rel = 'obj'
    }

    // administratively make all participles have cop not aux
    if (t.interp.isParticiple()) {
      node.children.filter(x => uEq(x.node.rel, 'aux'))
        .forEach(x => x.node.rel = 'cop')
    }

    // change xcomp to ccomp
    if (uEq(t.rel, 'xcomp')
      && [/* 'xsubj-is-phantom-iobj', */ 'xsubj-is-obl'].some(x => t.hasTag(x as TokenTag))
    ) {
      t.rel = 'ccomp'
    }
  }

  let lastToken = last(basicNodes).node
  let rootIndex = basicNodes.findIndex(x => !x.node.hasDeps())

  // todo: remove?
  // set parataxis punct to the root
  if (lastToken.interp.isPunctuation()
    && uEq(lastToken.rel, 'parataxis')
  ) {
    lastToken.headIndex = rootIndex
  }
}

////////////////////////////////////////////////////////////////////////////////
export function standartizeSentenceForUd2_11(basicNodes: Array<TokenNode>) {
  for (let node of basicNodes) {
    let t = node.node

    // todo? set obj from rev to obl
    // todo: choose punct relation from the rigthtest token

    for (let edep of t.edeps) {
      if (!UD_23_OFFICIAL_SUBRELS_ENHANCED.has(edep.relation)) {
        // remove non-exportable subrels
        edep.relation = stripSubrel(edep.relation)
      }
    }


    // remove non-exportable subrels
    if (t.rel && !UD_23_OFFICIAL_SUBRELS.has(t.rel)) {
      t.rel = stripSubrel(t.rel)
    }

    if (uEq(t.rel, 'goeswith')) {
      node.parent.node.interp.setFeature(f.Typo, f.Typo.yes)
    }

    standartizeMorphoForUd2_11(t.interp, t.form)
  }
}


////////////////////////////////////////////////////////////////////////////////
// todo: move out
export function thisOrConjHead(node: GraphNode<Token>, predicate/* : TreedSentencePredicate */) {
  for (let t of node.walkThisAndUp0()) {
    if (!uEq(t.node.rel, 'conj')) {
      return predicate(t)
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isFeasibleAdvclHead(head: TokenNode) {
  return head.node.interp.isVerbial()
    || head.node.interp.isAdverb()
    || (head.node.interp.isAdjective() && !head.node.interp.isPronominal())
    || isNonverbialPredicate(head)
}

////////////////////////////////////////////////////////////////////////////////
export function isFeasibleAdvmod(head: TokenNode, dep: TokenNode) {
  return isFeasibleAdvclHead(head)
    || thisOrConjHead(head, x => uEq(x.node.rel, 'obl'))
    || isAdvmodParticle(dep)
}

////////////////////////////////////////////////////////////////////////////////
export function isPassive(t: TokenNode) {
  if (uEqSome(t.node.rel, SUBJECTS)) {
    if (t.parent.node.interp.isPassive()) {
      return true
    }
    if (t.parent.children.some(x => uEq(x.node.rel, 'xcomp')
      && x.node.rel !== 'xcomp:sp'
      && x.node.interp.isPassive())
    ) {
      return true
    }
  }
  return false
}

////////////////////////////////////////////////////////////////////////////////
export function fillWithValencyFromDict(interp: MorphInterp, valencyDict: ValencyDict) {
  if (interp.isVerb()) {
    interp.features.dictValency = valencyDict.lookupVerb(interp.lemma)
  } else if (interp.isNounish()) {
    interp.features.dictValency = valencyDict.lookupGerund(interp.lemma)
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isNonverbialPredicate(t: TokenNode) {
  return (t.node.interp.isNounish() || t.node.interp.isAdjective()) && t.children.some(
    x => uEqSome(x.node.rel, ['cop', 'nsubj', 'csubj'])
  )
}

////////////////////////////////////////////////////////////////////////////////
export function isNonverbialPredicateEnh(t: EnhancedNode) {
  return (t.node.interp.isNounish() || t.node.interp.isAdjective()) && t.outgoingArrows.some(
    x => uEqSome(x.attrib, ['cop', 'nsubj', 'csubj'])
  )
}

////////////////////////////////////////////////////////////////////////////////
export function hasPredication(t: TokenNode) {
  return t.node.hasTag('itsubj')
    // || t.node.hasTag('subjless-predication')
    || t.children.some(x => uEqSome(x.node.rel, SUBJECTS))
    // || t.children.some(x => uEqSome(x.node.rel, ['cop']))
    // || t.node.interp.isVerb() && !isInfinitive(t)
    || isFinite(t)
}

////////////////////////////////////////////////////////////////////////////////
export function areOkToBeGlued(t: TokenNode, tNext: TokenNode) {
  return t.node.interp.isPunctuation()
    || tNext.node.isElided()
    || tNext.node.interp.isPunctuation()
    || tNext.node.interp.isSymbol() && uEqSome(tNext.node.rel, ['discourse'])
    || ['~', '$', '#', '+', '×', '№', '€', '-', '°'].includes(t.node.interp.lemma)
    || ['%', '°', '+', '×', '$'].includes(tNext.node.interp.lemma)
}

////////////////////////////////////////////////////////////////////////////////
export function isEnhanced(relation: string) {
  return ENHANCED_RELATIONS.includes(relation)
}

////////////////////////////////////////////////////////////////////////////////
export function isHelper(relation: string) {
  return HELPER_RELATIONS.has(relation)
}

////////////////////////////////////////////////////////////////////////////////
export function isProposition(relation: string) {
  return PROPBANK_RELATIONS.has(relation)
}

////////////////////////////////////////////////////////////////////////////////
export const enum DependencyType { basic, enhanced, proposition, helper }

////////////////////////////////////////////////////////////////////////////////
export function classifyRelation(relation: string) {
  if (isEnhanced(relation)) {
    return DependencyType.enhanced
  }
  if (isHelper(relation)) {
    return DependencyType.helper
  }
  if (isProposition(relation)) {
    return DependencyType.proposition
  }

  return DependencyType.basic
}

////////////////////////////////////////////////////////////////////////////////
export const ADVMOD_NONADVERBIAL_LEMMAS = [
  'не',
  'ні',
  'ані',
]

////////////////////////////////////////////////////////////////////////////////
export const SUBORDINATE_CLAUSES = [
  'csubj',
  'ccomp',
  'xcomp',
  'advcl',
  'acl',
]

////////////////////////////////////////////////////////////////////////////////
export const SOME_MODAL_ADVS = [
  'важко',
  'важливо',
  'варт',
  'варто',
  'вільно',
  'гарно',
  'дивно',
  'довше',
  'дозволено',
  'досить',
  'достатньо',
  'доцільно',
  'жарко',
  'запізно',
  'зручніше',
  'краще',
  'легко',
  'ліпше',
  'може',
  'можливо',
  'можна',
  'найкраще',
  'найліпше',
  'найтяжче',
  'невільно',
  'неефективно',
  'неможливо',
  'необхідно',
  'ніяково',
  'нормально',
  'потрібно',
  'правильно',
  'приємно',
  'реально',
  'слід',
  'сором',
  'треба',
  'цікаво',
  'чемно',
]

const NUM_ADV_AMBIG = [
  'багато',
  'небагато',
  'скілька',
  'скільки',
  'скількись',
  'скількі',
]

export const QAUNTITATIVE_ADVERBS = [
  ...NUM_ADV_AMBIG,
  'багацько',
  'більше',
  'достатньо',
  'мало',
  'менше',
  'найбільше',
  'найменше',
  'немало',
  'стільки',
  'трохи',
  'трошки',
  'чимало',
]

export const NOUN_MODIFIABLE_ADVS = [
  'майже',
]

export const CORE_COMPLEMENTS = [
  'obj',
  // 'xcomp',
  'ccomp',
]

export const CORE_COMPLEMENTS_XCOMP = [
  ...CORE_COMPLEMENTS,
  'xcomp'
]

export const COMPLEMENTS = [
  ...CORE_COMPLEMENTS,
  'iobj',
]

export const SUBJECTS = [
  'nsubj',
  'csubj',
]

export const CORE_ARGUMENTS = [
  ...SUBJECTS,
  ...COMPLEMENTS,
]

export const NOMINAL_HEAD_MODIFIERS = [
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

export const SOME_FREQUENT_TRANSITIVE_VERBS = [
  'бажати',
  'вважати',
  'вважати',
  'вимагати',
  'вирішити',
  'виходити',
  'встигнути',
  'дозволити',
  'дозволяти',
  'доручити',
  'заборонити',
  'завадити',
  'змогти',
  'змусити',
  'змушувати',
  'зуміти',
  'любити',
  'мати',
  'могти',
  'мусити',
  'переставати',
  'почати',
  'починати',
  'примушувати',
  'припинити',
  'пропонувати',
  'радити',
  'розуміти',
  'спробувати',
  'спробувити',
  'спробувити',
  'хотіти',
  // 'звикнути',
]

export const SOME_FREQUENT_INTRANSITIVE_VERBS = [
  'бігти',
  'вабити',  //
  'їхати',
  'поїхати',
  'приходити',
  'сідати',
  'ходити',
]

export const SOME_DATIVE_VALENCY_NOUNS = new Set([
  'вдячність',
  'видача',
  'визначення',
  'відповідність',
  'довг',
  'допомога',
  'доставка',
  'загроза',
  'запобігання',
  'заподіяння',
  'інтерв’ю',
  'край',
  'надання',
  'надсилання',
  'нанесення',
  'опір',
  'п.',
  'пам’ятник',
  'передання',
  'передача',
  'побажання',
  'повернення',
  'повідомлення',
  'подібне',
  'поклоніння',
  'поміч',
  'посвята',
  'привітання',
  'пригода',
  'придбання',
  'протидія',
  'сприяння',
  'спротив',
  'угода',  // деякі неоднозначні!
  'уклін',
])

export const MONTHS = [
  'січень',
  'лютий',
  'березень',
  'квітень',
  'травень',
  'червень',
  'липень',
  'серпень',
  'вересень',
  'жовтень',
  'листопад',
  'грудень',
]

export const COMPARATIVE_ADVS = [
  'більше',
  'більш',
  'менш',
  'менше'
]

export const COMPARATIVE_SCONJS = [
  'ніж',
  'як',
  // 'від',
  'чим'
]

export const CONJ_PROPAGATION_RELS_ARR = [
  'private',
  'distrib',
  'collect'
]
export const CONJ_PROPAGATION_RELS = new Set(CONJ_PROPAGATION_RELS_ARR)

export const HELPER_RELATIONS = CONJ_PROPAGATION_RELS

export const PROPBANK_RELATIONS = new Set([
  'arg0',  // obsolete
  'arg1',  // obsolete
  'arg2',  // obsolete
  'agent',  // obsolete
  'patient',  // obsolete
  'benefactor',
  'instrument',

  'pag',
  'ppt',
  'com',
  'gol',
  'dir',
  'loc',
  'tmp',
  'mnr',
  'ext',
  'prp',
  'cau'
])

export const ALLOWED_RELATIONS /* : Array<UdMiRelation> */ = [
  'acl:adv',
  'acl:irrel',  // nothing relative about it
  'acl:parataxis',
  // 'acl:relfull',  // has an overt PronType=Rel descendant
  'acl:relless',  // relative, but no overt PronType=Rel descendant, <nsubj back to antecedent
  // 'acl:relpers',  // relative, no PronType=Rel, but antecedent doubled by PronType=Pers
  'acl',
  'adv:gerund',
  'advcl:cmp',
  'advcl:sp',
  'advcl:svc',
  'advcl',
  'advmod:amtgov',
  'advmod:det',
  'advmod',
  'amod',
  'appos:spec',
  'appos:nonnom',
  'appos:reverse',
  'appos',
  'aux',
  'case',
  'cc',
  'ccomp:svc',
  'ccomp',
  'compound:svc',
  'compound',
  'conj:parataxis',
  'conj:repeat',
  'conj:svc',
  'conj:upperlevel',
  'conj',
  'cop',
  'csubj',
  'det:numgov',
  'det:nummod',
  'det',
  'discourse',
  'dislocated',
  'expl',
  'fixed',
  'flat:abs',
  'flat:foreign',
  'flat:name',
  'flat:range',
  'flat:repeat',
  'flat:sibl',
  'flat:title',
  'flat',
  'goeswith',
  'iobj',
  'list',
  'mark',
  'nmod:iobj',
  'nmod:obj',
  'nmod:xcompsp',
  'nmod',
  'nsubj:pass',
  'nsubj',
  'nummod:gov',
  'nummod',
  'obj',
  'obl:arg',
  'obl',
  'orphan',
  'parataxis:discourse',
  'parataxis:newsent',
  'parataxis:rel',
  'parataxis:thatis',
  'parataxis',
  'punct',
  'reparandum',
  'root',
  'vocative:cl',
  'vocative',
  'xcomp:sp',
  'xcomp',
]
export const LEAF_RELATIONS = [
  'cop',
  'aux',
  'expl',
  'fixed',
  // 'flat',
  'goeswith',
  'punct',
  'case',
]

export const LEFT_POINTED_RELATIONS = [
  // 'case',  // treated separately
  'cc',
  'reparandum',
]

export const RIGHT_POINTED_RELATIONS = [
  'appos',
  'conj',
  'fixed',
  'flat',
  'goeswith',
  'list',
]

export const DISCOURSE_DESTANATIONS = [
  'PART',
  'SYM',
  'INTJ',
  'ADV',  // temp
]

export const COPULA_LEMMAS = [
  'бути',
  'бувати',
  'будучи',  // ?
]

export const CONDITIONAL_AUX_LEMMAS = [
  'б',
  'би',
]

export const AUX_LEMMAS = [
  ...COPULA_LEMMAS,
  ...CONDITIONAL_AUX_LEMMAS,
]

export const CLAUSAL_MODIFIERS = SUBORDINATE_CLAUSES

export const EXPL_FORMS = [
  'собі',
  'воно',
  'це',
  'то',
]

export const CLAUSE_RELS = [
  ...SUBORDINATE_CLAUSES,
  'parataxis',
]

export const MARK_ROOT_RELS = [
  ...SUBORDINATE_CLAUSES,
  'appos',
  'parataxis:discourse',
]

export const CONTINUOUS_REL = [
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


export const POSES_NEVER_ROOT: Array<UdPos> = [
  // 'ADP',
  'AUX',
  // 'CCONJ',
  // 'SCONJ',
  // 'NUM',
  // 'PART',
  'PUNCT',
]

////////////////////////////////////////////////////////////////////////////////
export const CLAUSAL_TO_PLAIN = new Map([
  ['csubj', 'nsubj'],
  ['ccomp', 'obj'],
  ['advcl', 'adv'],
])

export const CURRENCY_SYMBOLS = [
  '₴',
  '$',
  '€',
]

export const INS_VALENCY_VERBS = [
  // 'даний',
  // 'одмітний',
  // 'переповнений',
  // 'засмічений',
  // 'узятий',
  // 'зацікавлений',

  // 'володіти',
  // 'задовольнитися',
  // 'зробитися',

  // 'рискувати',
  // 'пожертвувати',
  // 'тхнути',
  // 'тягнути',
  // 'називати',
  // 'дихнути',
  // 'нехтувати',
  // 'пахнути',

  'командувати',
  'курувати',
  'керувати',
  'нехтувати',
  'знехтувати',
  'володіти',
  'опікуватися',
  'відати',
  // 'пахнути',
]

export const SOME_WORDS_WITH_ACC_VALENCY = new Set([  // not in valency dict
  'бігати',
  'бігти',
  'бухтіти',
  'досиджувати',
  'думати',
  'дякувати',
  'зазначити',
  'заказати',
  'запитувати',
  'збутися',
  'інкримінувати',
  'наложити',
  'нотувати',
  'поворожити',
  'пообростати',
  'постачати',
  'продивлятися',
  'проскочити',
  'розмістити',
  'розміщувати',
  'штовхнути',
  'являти',
  'виплюнути',
  'виповнювати',
  'виготовляти',
  'боятися',
  'затискати',
])

export const VALID_ADVS_AMBIG_TO_NOUN = new Set([
  'варто',
  'відразу',
  'враз',
  'все',  // ~
  'вчора',
  'далі',
  'дещо',
  'дибки',
  'доки',
  'досі',
  'загалом',
  'зараз',
  'зразу',
  'коли',
  'коли',
  'надміру',
  'палко',
  'погано',
  'разом',
  'різко',
  'руба',
  'слід',
  'струнко',
  'сьогодні',
  'тому',
  'тому',
  'тому',
  'треба',
  'усюди',  // ~?
  'чого',
  'чому',
  'щось',
  'як',
  'як',
])

export const PREPS_HEADABLE_BY_NUMS = [
  'близько',
  'понад',
]

export const TEMPORAL_ACCUSATIVES = [
  'вечір',
  'година',
  'день',
  'доба',
  'ніч',
  'раз',
  'рік',
  'секунда',
  'тиждень',
  'хвилина',
  'хвилинка',
  'ранок',
  'мить',
  'час',
  'безліч',
  'р.',
  'місяць',
  'півгодини',
]

export const GENDERLESS_PRONOUNS = [
  'абихто',
  'будь-хто',  // прибрати після розділу
  'ви',
  'вони',  // todo: ns?
  'дехто',
  'дещо',  // ніякий?
  'ми',
  'ніхто',
  'ніщо',  // середній?
  'себе',
  'ти',
  'хто-небудь',  // прибрати після розділу
  'хтось',
  'я',
]

export const EMPTY_ANIMACY_NOUNS = [
  'себе',
  'ся',
]

const GEN_VALENCY_ADJECTIVES = new Set([
  'певний',
  'сповнений',
  'позбавлений',
  'повний',
  'повнісінький',
])

const DAT_VALENCY_ADJECTIVES = new Set([
  'ближчий',
  'ближчий',
  'вигідний',
  'виписаний',
  'відданий',
  'відомий',
  'вдячний',
  'властивий',
  'доступний',
  'звичний',
  'найвірніший',
  'незнайомий',
  'ненависний',
  'переданий',
  'передбачений',
  'піддатний',
  'підконтрольний',
  'повернений',
  'потрібний',
  'присвячений',
  'подобний',
  'подібний',
  'нерекомендований',
  'приступніший',
])

const INF_VALENCY_ADJECTIVES = [
  'готовий',
  'здатний',
  'радий',
  'неспроможний',
  'неготовий',
  'повинний',
  'нездатний',
  'змушений',
  'покликаний',
]

export const ADVMOD_DETS = new Set([
  'такий',
  'такенький',
  'який',
])

export const QUANTIF_PREP = [
  'понад',
  'близько',
]

export const PROMOTION_PRECEDENCE = [
  'nsubj',
  'obj',
  'iobj',
  'obl',
  'advmod',
]

export const ENHANCED_RELATIONS = [
  'ref',

  'iobj:rel',
  'nsubj:rel',
  'obj:rel',
  'obl:rel',

  'nsubj:x',
  'csubj:x',

  'nsubj:sp',
  'csubj:sp',
]

export const SOME_QUOTES = /^[«»"”“„']+$/

//------------------------------------------------------------------------------
const UD_23_OFFICIAL_SUBRELS = new Set([
  'acl:adv',
  'acl:relcl',
  'admod:amtgov',
  'advcl:sp',
  'advcl:svc',
  'advmod:det',
  'ccomp:svc',
  'compound:svc',
  'conj:svc',
  'det:numgov',
  'det:nummod',
  'flat:foreign',
  'flat:name',
  'flat:sibl',
  'flat:range',
  'flat:abs',
  'flat:repeat',
  'flat:title',
  'nummod:gov',
  'parataxis:discourse',
  'parataxis:newsent',
  'parataxis:rel',
  'xcomp:sp',
  'vocative:cl',
])

//------------------------------------------------------------------------------
const UD_23_OFFICIAL_SUBRELS_ENHANCED = new Set([
  ...UD_23_OFFICIAL_SUBRELS,
  ...ENHANCED_RELATIONS.filter(x => x.includes(':'))
])
