import { Token } from '../token'
import { uEq, uEqSome } from './utils'
import {
  TokenNode, SUBJECTS, isPromoted, EnhancedNode,
  EnhancedArrow,
} from './uk_grammar'
import { DirectedGraphNode, DupePolicy } from '../../directed_graph'
import { last } from '../../lang'



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
  addCoreferenceForPersonalRelcl(enhancedNodes)
  addCoreferenceForClassicalRelcl(enhancedNodes)
  // (relcls without a Rel only have `ref` (annotated manually))
  // propagateConjuncts(enhancedNodes, true)  // propagate what we just generated

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
function addCoreferenceForClassicalRelcl(enhancedNodes: Array<EnhancedNode>) {
  for (let node of enhancedNodes) {
    for (let arrow of node.incomingArrows) {
      if (uEq(arrow.attrib, 'acl:relfull')) {
        let relclArrow = arrow

        if (relclArrow.end.node.interp.isRelative()) {
          let refArrow = relclArrow.start.addOutgoingArrow(relclArrow.end, 'ref', DupePolicy.throw, true)
          addFromNominalRelclHeadBackToAntecedent(refArrow)
        } else {
          let arrowsIntoRelative = relclArrow.end.pathsForwardWidth({
            // cutAndFilter: path => uEqSome(last(path).attrib, CLAUSE_RELS),
            // cutAndInclude: path => uEqSome(last(path).attrib, ['acl']),
          })
            .map(x => last(x))
            .filter(x => x.end.node.interp.isRelative() && !uEqSome(x.attrib, ['ref', 'conj']))
            .toArray()

          if (!arrowsIntoRelative.length) {
            // throw new Error(`No relative in acl:relfull: Id=${relclArrow.end.node.id}`)
          }
          if (arrowsIntoRelative.length > 1) {
            // throw new Error(`${arrowsIntoRelative.length} relatives in acl:relfull`)
          }
          if (arrowsIntoRelative.length) {
            // todo: duped
            let refArrow = relclArrow.start.addOutgoingArrow(arrowsIntoRelative[0].end, 'ref', DupePolicy.ignore, true)
            addFromRelclBackToAntecedent(refArrow)
          }
        }
      }
    }
  }
}

//------------------------------------------------------------------------------
function addCoreferenceForPersonalRelcl(enhancedNodes: Array<EnhancedNode>) {
  for (let node of enhancedNodes) {
    for (let arrow of node.incomingArrows) {
      if (uEq(arrow.attrib, 'ref')) {  // annotated manually
        let refArrow = arrow  // to name
        let relclArrows = refArrow.start.outgoingArrows.filter(x => x.attrib === 'acl:relpers')
        if (!relclArrows.length) {
          throw new Error(`ref not from acl:relpers`)
        }
        let refAsPredicate = relclArrows.some(x => x.end === refArrow.end)
        if (refAsPredicate) {
          // переможець, що ним є ти
          addFromNominalRelclHeadBackToAntecedent(refArrow)
        } else {
          // дівчина, що нею милувався
          addFromRelclBackToAntecedent(refArrow)
        }
      }
    }
  }
}

//------------------------------------------------------------------------------
function addFromRelclBackToAntecedent(refArrow: EnhancedArrow) {
  refArrow.end.incomingArrows
    .filter(x => x !== refArrow && !uEqSome(x.attrib, ['conj', 'ref']))
    // todo: predict rel
    .forEach(incomingArrow =>
      incomingArrow.start.addOutgoingArrow(refArrow.start, `${incomingArrow.attrib}:rel`, DupePolicy.ignore, true)
    )
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
  for (let node of enhancedTree) {
    let firstConjChain = node.walkBackMu(({ attrib: rel }) => uEq(rel, 'conj') && rel !== 'conj:parataxis')
      .map(x => x.start)
    for (let firstConj of firstConjChain) {
      firstConj.outgoingArrows
        .filter(x => x.end !== node
          && (uEq(x.attrib, 'ref')
            || x.end.node.hdeps.some(helperDep => helperDep.headId === firstConj.node.id
              && ['distrib', 'collect'].includes(helperDep.relation)
            )
          )
        )
        .forEach(x => x.end.addIncomingArrow(node, x.attrib, dupePolicy, !dupesExpected))
    }
  }

  // 2: conjuncts are dependents: _a long and wide river_
  for (let node of enhancedTree) {
    let topConj = node.walkBackMu(({ attrib: rel }) => uEq(rel, 'conj'))
      .map(x => x.start)
      .last()
    if (topConj && topConj.hasIncoming()) {
      // wrong, redo
      // let newRel = findRelationAnalog(basicNodes[i], basicNodes[conjHead.start.node.index])
      let newRel = topConj.incomingArrows[0].attrib
      topConj.incomingArrows
        .filter(x => !uEqSome(x.attrib, ['parataxis']))
        .forEach(x => node.addIncomingArrow(x.start, newRel, dupePolicy, !dupesExpected))
    }
  }
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
