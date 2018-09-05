import { Token } from '../token'
import { uEq, uEqSome } from './utils'
import { SimpleGrouping } from '../../grouping'
import { TokenNode, findRelationAnalog, SUBJECTS, isPromoted, EnhancedNode } from './uk_grammar'
import { DirectedGraphNode } from '../../directed_graph'
import { mu } from '../../mu';



////////////////////////////////////////////////////////////////////////////////
// http://universaldependencies.org/u/overview/enhanced-syntax.html
//
// sent_id = 3bgj do not distribute to promoted!!
// todo: dislocated?
// todo: у такому становищі [є] один крок для того — в enhanced інший корінь!
//       https://lab.mova.institute/brat/#/ud/vislotska__kohannia/30
// todo: fix duplicate edeps
// todo: test nested conj
// todo: check conj paths are followed
// todo: 5-10 м/с не конж
// todo: do everything on enhanced tree after propagation of conjuncts??
// todo: do not conj-propagate parataxis/clauses?, id=1286, Id=36ej
// bug: Id=37d4
// todo: where are conj in conj propagations?
// todo: no orphans in enhanced
// todo: ~Id=2gst
// todo: Id=141k
// todo: multilevel conj
//
////////////////////////////////////////////////////////////////////////////////
export function generateEnhancedDeps2(
  basicNodes: Array<TokenNode>,
  corefClusterization: SimpleGrouping<Token>,
) {
  let enhancedNodes = buildEnhancedTree(basicNodes)
  propagateConjuncts(enhancedNodes)
  addXcompSubject(enhancedNodes)
  addAdvclspSubject(enhancedNodes)
  addCoreferenceInRelcl(enhancedNodes, corefClusterization)

  saveEnhancedGraphToTokens(enhancedNodes)
}

////////////////////////////////////////////////////////////////////////////////
export function addCoreferenceInRelcl(
  enhancedNodes: Array<EnhancedNode>,
  corefClusterization: SimpleGrouping<Token>,
) {
  // todo: adv?
  // todo: check deep backward

  // let relRoot = findRelativeClauseRoot(node)
  // if (relRoot) {
  //   if (node.node.interp.isRelative()) {
  //     // handleRelcl(relRoot, node)
  //   } else {
  //     let antecedent = findShchojijiAntecedent(node)
  //     if (antecedent && corefClusterization.areSameGroup(antecedent.node, node.node)) {
  //       // handleRelcl(relRoot, node)
  //     }
  //   }
  // }
}

////////////////////////////////////////////////////////////////////////////////
export function addAdvclspSubject(enhancedNodes: Array<EnhancedNode>) {
  // todo: Id=1765
  for (let node of enhancedNodes) {
    node.incomingArrows.filter(x => x.attrib === 'advcl:sp')
      .forEach(advclArrow => {
        // вона зайшла сумна
        advclArrow.start.outgoingArrows.filter(x => uEqSome(x.attrib, SUBJECTS))
          .forEach(subjArrow => subjArrow.end.addIncomingArrow(node, subjArrow.attrib))
        // todo:
        // побачив її сумну
        // || advclArrow.start.outgoingArrows.find(x => uEqSome(x.attrib, COMPLEMENTS))
      })
  }
}

////////////////////////////////////////////////////////////////////////////////
export function addXcompSubject(enhancedNodes: Array<EnhancedNode>) {
  // UD: “Additional subject relations for control and raising constructions”
  for (let node of enhancedNodes) {
    node.walkBack(({ attrib: rel }) => uEq(rel, 'xcomp'))
      .map(x => findXcompSubjectsArrows(x.start))
      .take(1)  // хтось почне розглядати його як нормальний варіант — stop on розглядати
      // .filter(x => x.length)
      // .map(x => [x[0]])
      .forEach(subjArrows => subjArrows.forEach(subjArow => {
        let rel = uEqSome(subjArow.attrib, ['obj', 'iobj']) ? 'nsubj' : subjArow.attrib
        node.addOutgoingArrow(subjArow.end, rel)
      }))
  }
}

////////////////////////////////////////////////////////////////////////////////
export function propagateConjuncts(enhancedTree: Array<EnhancedNode>) {
  // _Paul and Mary+Zina are watching a movie or rapidly (reading or eating)._

  // 1: conjuncts are governors: eating->rapidly, reading->Paul, eating->Paul
  for (let node of enhancedTree) {
    let firstConjChain = node.walkBack(({ attrib: rel }) => uEq(rel, 'conj') && rel !== 'conj:parataxis')
      .map(x => x.start)
    for (let firstConj of firstConjChain) {
      firstConj.outgoingArrows
        .filter(x => x.end !== node && x.end.node.helperDeps.some(helperDep => helperDep.headId === firstConj.node.id
          && ['distrib', 'collect'].includes(helperDep.relation)))
        .forEach(x => x.end.addIncomingArrow(node, x.attrib))
    }
  }

  // 2: conjuncts are dependents: _a long and wide river_
  for (let node of enhancedTree) {
    let topConj = node.walkBack(({ attrib: rel }) => uEq(rel, 'conj'))
      .map(x => x.start)
      .last()
    if (topConj && topConj.hasIncoming()) {
      // wrong, redo
      // let newRel = findRelationAnalog(basicNodes[i], basicNodes[conjHead.start.node.index])
      let newRel = topConj.incomingArrows[0].attrib
      topConj.incomingArrows
        .filter(x => !uEqSome(x.attrib, ['parataxis']))
        .forEach(x => node.addIncomingArrow(x.start, newRel))
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function buildEnhancedTree(basicNodes: Array<TokenNode>) {
  let ret = basicNodes.map(x => new DirectedGraphNode<Token, string>(x.node))

  for (let [i, basicNode] of basicNodes.entries()) {
    if (!isPromoted(basicNode)) {
      // 1: copy basic arrows except for orphans
      basicNode.node.deps.forEach(x =>
        ret[i].addIncomingArrow(ret[x.headIndex], x.relation))
    } else {
      // 2: add deps touching elided tokens
      // UD: “Null nodes for elided predicates”
      basicNodes[i].node.deps
        .filter(x => basicNodes[x.headIndex].node.isElided())
        .forEach(x =>
          ret[i].addIncomingArrow(ret[x.headIndex], x.relation))
    }
  }

  return ret
}

////////////////////////////////////////////////////////////////////////////////
export function findXcompSubjectsArrows(xcompHead: EnhancedNode) {
  return mu(['obj', 'iobj', 'nsubj', 'csubj'])
    .map(r => xcompHead.outgoingArrows.filter(x => uEq(x.attrib, r)))
    .filter(x => x.length)
    .first() || []  // todo: prove
}

////////////////////////////////////////////////////////////////////////////////
export function saveEnhancedGraphToTokens(enhancedNodes: Array<EnhancedNode>) {
  for (let node of enhancedNodes) {
    node.node.edeps.push(...node.incomingArrows.map(x => ({
      headId: x.start.node.id,
      headIndex: x.start.node.index,
      relation: x.attrib,
    })))
  }
}
