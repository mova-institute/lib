import { Token } from '../token'
import { uEq, uEqSome } from './utils'
import {
  TokenNode, SUBJECTS, isPromoted, EnhancedNode,
  EnhancedArrow,
  CLAUSAL_MODIFIERS,
  CLAUSAL_TO_PLAIN,
  CLAUSE_RELS,
  isNonverbialPredicateEnh,
} from './uk_grammar'
import { DirectedGraphNode, DupePolicy } from '../../directed_graph'
import { UdPos, toUd } from './tagset'



////////////////////////////////////////////////////////////////////////////////
// http://universaldependencies.org/u/overview/enhanced-syntax.html
//
// sent_id = 3bgj do not distribute to promoted!!
// todo: dislocated?
// todo: test nested conj
// todo: check conj paths are followed
// todo: 5-10 м/с не конж
// todo: do not conj-propagate parataxis/clauses?, id=1286, Id=36ej
// bug: Id=37d4
// todo: where are conj in conj propagations?
// todo: ~Id=2gst
// todo: Id=141k
// todo: multilevel conj
//
// Плакати й стрічки , що повишивали дівчата
// todo: propagate obj повишивали > стрічки
// todo: треба двічі propagateConjuncts?
//
// todo: does ref conj-propagate?
// todo: adv?
// todo: check deep backward
// todo: test _men and women that we loved and hated_
// todo: Автор заслуговує високої нагороди за **те** , що зрозумів
// todo: а читала все, що запорву — не nsubj у все
// todo: parataxis:rel
// todo: findRelationAnalog
// todo: Недарма казали в народі : " Не той козак , хто переміг , а той , хто викрутився
//
////////////////////////////////////////////////////////////////////////////////
export function generateEnhancedDeps2(
  basicNodes: Array<TokenNode>,
) {
  let enhancedNodes = buildEnhancedTree(basicNodes)
  connectEphemeralRoot(enhancedNodes)  // to conj-propagate root
  loadEnhancedGraphFromTokens(enhancedNodes)  // read manual enhanced annotation
  propagateConjuncts(enhancedNodes)
  addRelclBackwardLinks(enhancedNodes)
  // propagateConjuncts(enhancedNodes, true)  // propagate what we've just generated

  saveEnhancedGraphToTokens(enhancedNodes, true)
}

//------------------------------------------------------------------------------
function connectEphemeralRoot(enhancedNodes: Array<EnhancedNode>) {
  let ephemeralRootNode = new DirectedGraphNode<Token, string>(new Token())
  ephemeralRootNode.node.index = -1

  enhancedNodes.filter(x => !x.hasIncoming())
    .forEach(x => x.addIncomingArrow(ephemeralRootNode, 'root', DupePolicy.throw, true))
}

//------------------------------------------------------------------------------
function addRelclBackwardLinks(enhancedNodes: Array<EnhancedNode>) {
  for (let node of enhancedNodes) {
    for (let arrow of node.incomingArrows) {
      if (uEq(arrow.attrib, 'ref')) {  // annotated manually
        let ref = arrow
        let isNonverbalPredication = isNonverbialPredicateEnh(ref.end)
        if (ref.end.node.interp.isRelative()) {
          if (isNonverbalPredication) {
            addFromNominalRelclHeadBackToAntecedent(ref)
          } else {
            addFromRelclBackToAntecedent(ref)
          }
        } else {
          if (isNonverbalPredication) {
            // переможець, що ним є ти
            addFromNominalRelclHeadBackToAntecedent(ref)
          } else {
            // дівчина, що нею милувався
            addFromRelclBackToAntecedent(ref)
          }
        }
      }
    }
  }
}

//------------------------------------------------------------------------------
function addFromRelclBackToAntecedent(refArrow: EnhancedArrow) {
  refArrow.end.incomingArrows
    .filter(x => x !== refArrow && !uEqSome(x.attrib, ['conj', 'ref']))
    .forEach(incomingArrow => {
      let newRel = findRelationAnalog(incomingArrow, refArrow.end, refArrow.start)
      incomingArrow.start.addOutgoingArrow(refArrow.start, relativizeRel(newRel),
        DupePolicy.ignore, true)
    })
}

//------------------------------------------------------------------------------
function relativizeRel(relation: string) {
  if (relation.includes(':')) {  // todo
    return relation
  }
  return `${relation}:rel`
}

//------------------------------------------------------------------------------
function addFromNominalRelclHeadBackToAntecedent(refArrow: EnhancedArrow) {
  refArrow.end.outgoingArrows
    .filter(x => uEqSome(x.attrib, SUBJECTS))
    .forEach(subjArrow => refArrow.start.addOutgoingArrow(
      subjArrow.end, `${subjArrow.attrib}:relnompred`, DupePolicy.throw, true))
}

//------------------------------------------------------------------------------
function propagateConjuncts(enhancedTree: Array<EnhancedNode>, dupesExpected = false) {
  // _Paul and Mary+Zina are watching a movie or rapidly (reading or eating)._

  let dupePolicy = dupesExpected ? DupePolicy.ignore : DupePolicy.throw

  // 1: conjuncts are governors: eating->rapidly, reading->Paul, eating->Paul
  // if (!dupesExpected) {
  for (let node of enhancedTree) {
    let firstConjChain = node.walkBackMu(({ attrib: rel }) => uEq(rel, 'conj') && rel !== 'conj:parataxis')
      .map(x => x.start)
    for (let firstConj of firstConjChain) {
      firstConj.outgoingArrows
        .filter(x => x.end !== node
          // todo: share ref depending on helpers for :relcl
          && (/* uEq(x.attrib, 'ref') || */ x.end.node.hdeps.some(helperDep => helperDep.headId === firstConj.node.id
            && (['distrib', 'collect'].includes(helperDep.relation)
              // || uEqSome(x.attrib, ['nsubj', 'csubj'])  // temp
            )
          )
          )
        )
        .forEach(x => x.end.addIncomingArrow(node, x.attrib, dupePolicy, !dupesExpected))
    }
  }
  // }

  // 2: conjuncts are dependents: _a long and wide river_
  for (let node of enhancedTree) {
    let topConj = node.walkBackMu(({ attrib: rel }) => uEq(rel, 'conj'))
      .map(x => x.start)
      .last()
    if (topConj) {
      topConj.incomingArrows
        .filter(x => !uEqSome(x.attrib, ['parataxis']))
        .forEach(x => node.addIncomingArrow(
          x.start,
          findRelationAnalog(x, x.start, node),  // todo
          dupePolicy,
          !dupesExpected)
        )
    }
  }
}

//------------------------------------------------------------------------------
function findRelationAnalog(existingArrow: EnhancedArrow, newStart: EnhancedNode, newDependent: EnhancedNode) {
  let existingRel = existingArrow.attrib
  let existingDependent = existingArrow.start
  let { pos: newDepPos } = toUd(newDependent.node.interp)
  let { pos: existingDepPos } = toUd(existingArrow.end.node.interp)
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
  if (uEq(existingRel, 'det') && newDepPos === 'ADJ') {
    return 'amod'
  }
  if (uEqSome(existingRel, ['amod', 'det']) && newDependent.node.interp.isNounish()) {
    return 'nmod'
  }

  // if (uEqSome(existingRel, CLAUSAL_MODIFIERS) && definitelyIsPredicate(newDependent)) {
  //   return existingRel
  // }

  if (uEq(existingRel, 'advcl')
    && existingDependent.node.interp.isConverb()
    && newDependent.node.interp.isAdjective()
  ) {
    return 'advcl:sp'
  }

  // for (let [clausal, plain] of CLAUSAL_TO_PLAIN) {
  //   if (uEq(existingRel, clausal)
  //     && !definitelyIsPredicate(newDependent)
  //     && !newDependent.node.interp.isVerbial()
  //   ) {
  //     // return plain
  //   }
  //   if (uEq(existingRel, plain) && definitelyIsPredicate(newDependent)) {
  //     // return clausal
  //   }
  // }

  if (newDepPos === existingDepPos) {
    return existingRel  // risky
  }

  return existingRel  // last resort
}

//------------------------------------------------------------------------------
function dumbDownUdPos(upos: UdPos) {
  if (upos === 'PROPN' || upos === 'PRON') {
    return 'NOUN'
  }
  return upos
}

////////////////////////////////////////////////////////////////////////////////
export function loadEnhancedGraphFromTokens(nodes: Array<EnhancedNode>) {
  for (let node of nodes) {
    for (let edep of node.node.edeps) {
      if (node.node.id === edep.headId) {
        console.error(node.node.id)
        console.error(nodes)
      }
      node.addIncomingArrow(nodes[edep.headIndex], edep.relation, DupePolicy.throw, true)
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function buildEnhancedGraphFromTokens(basicNodes: Array<TokenNode>) {
  let ret = basicNodes.map(x => new DirectedGraphNode<Token, string>(x.node))
  loadEnhancedGraphFromTokens(ret)

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function buildEnhancedTree(basicNodes: Array<TokenNode>) {
  let ret = basicNodes.map(x => new DirectedGraphNode<Token, string>(x.node))

  for (let [i, basicNode] of basicNodes.entries()) {
    if (!isPromoted(basicNode)) {
      // 1: copy basic arrows except for orphans
      basicNode.node.deps.forEach(x =>
        ret[i].addIncomingArrow(ret[x.headIndex], x.relation, DupePolicy.throw, true))
    } else {
      // 2: add deps touching elided tokens
      // UD: “Null nodes for elided predicates”
      basicNode.node.deps
        .filter(x => basicNodes[x.headIndex].node.isElided())
        .forEach(x =>
          ret[i].addIncomingArrow(ret[x.headIndex], x.relation, DupePolicy.throw, true))
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function saveEnhancedGraphToTokens(
  enhancedNodes: Array<EnhancedNode>,
  clean: boolean,
) {
  for (let node of enhancedNodes) {
    let edeps = node.incomingArrows.map(x => ({
      headId: x.start.node.id,
      headIndex: x.start.node.index,
      relation: x.attrib,
    }))

    if (clean) {
      node.node.edeps = edeps
    } else {
      node.node.edeps.push(...edeps)
    }
  }
}
