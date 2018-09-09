import { Token } from '../token'
import { uEq, uEqSome } from './utils'
import { SimpleGrouping } from '../../grouping'
import { TokenNode, findRelationAnalog, SUBJECTS, isPromoted, EnhancedNode, CLAUSE_RELS, EnhancedArrow } from './uk_grammar'
import { DirectedGraphNode } from '../../directed_graph'
import { mu } from '../../mu'
import { last } from '../../lang'



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
// Плакати й стрічки , що повишивали дівчата
// todo: propagate obj повишивали > стрічки
// треба двічі propagateConjuncts?
//
////////////////////////////////////////////////////////////////////////////////
export function generateEnhancedDeps2(
  basicNodes: Array<TokenNode>,
  corefClusterization: SimpleGrouping<Token>,
) {
  let enhancedNodes = buildEnhancedTree(basicNodes)

  loadEnhancedGraphFromTokens(enhancedNodes)
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
  // todo: test _men and women that we loved and hated_
  // todo: Автор заслуговує високої нагороди за **те** , що зрозумів
  // todo: а читала все, що запорву — не nsubj у все

  for (let node of enhancedNodes) {
    for (let relclArrow of node.incomingArrows) {
      if (relclArrow.attrib === 'acl:relless') {
        // the backward arrow was annotated manually
        // no `ref` for :relless
        // nothing to do
      } else if (relclArrow.attrib === 'acl:relpers') {
        // `ref` was annotated manually, now add backward arrow automatically
        relclArrow.start.outgoingArrows
          .filter(x => x.attrib === 'ref')
          .forEach(ref => addBackwardForRelcl(relclArrow, ref))

        /*
         ref.end.incomingArrows
         .filter(x => x !== ref && !uEq(x.attrib, 'conj'))
         .forEach(persIncoming =>
           persIncoming.start.addOutgoingArrow(relclArrow.start, persIncoming.attrib)
           // todo: predict rel
           // todo: переможець, що ним є ти
         )
       ) */
      } else if (relclArrow.attrib === 'acl:relfull') {
        let arrowsInRelative = relclArrow.end.pathsForwardWidth({
          // cutAndFilter: path => uEqSome(last(path).attrib, CLAUSE_RELS),
          // cutAndInclude: path => uEqSome(last(path).attrib, ['acl']),
        })
          .map(x => last(x))
          .filter(x => x.end.node.interp.isRelative() && !uEqSome(x.attrib, ['ref', 'conj']))
          .toArray()

        if (!arrowsInRelative.length) {
          // console.error(arrow.end.node)
        }

        arrowsInRelative.forEach(arrowInRelative => {
          if (arrowInRelative.end !== relclArrow.start) {
            relclArrow.start.addOutgoingArrow(arrowInRelative.end, 'ref')
          }
          arrowInRelative.start.addOutgoingArrow(relclArrow.start, arrowInRelative.attrib)
        })
      }
    }
  }
}

//------------------------------------------------------------------------------
function addBackwardForRelcl(relclArrow: EnhancedArrow, refArrow: EnhancedArrow) {
  if (refArrow.end === relclArrow.end) {

  }
}

//------------------------------------------------------------------------------
function addEnhancedForRelcl(relclArrow: EnhancedArrow, relativeArrow: EnhancedArrow) {

  // 1: чоловік, якого ми бачили: add чоловік ref> якого
  // todo: should we still ad ref for relclArrow === relativeArrow?
  relativeArrow.end.addIncomingArrow(relclArrow.start, 'ref')


  if (relclArrow === relativeArrow) {
    // _He became chairman, which he still is._: chairman nsubj> which
    // https://github.com/UniversalDependencies/docs/issues/531
    // We should […] add a nsubj relation from the antecedent
    //   to the nsubj of the relative pronoun.
  } else {
    // чоловік, якого ми бачили: add чоловік <obj бачили
    if (relclArrow.end === relativeArrow.start) {
      relclArrow.start.addIncomingArrow(relativeArrow.start, relativeArrow.attrib)
    }
  }

  // if (relRoot === relative) {

  // } else {

  //   antecedentArrows.forEach(antecedentArrow => {
  //     let relation: string
  //     if (
  //       antecedentArrow.start.node.interp.isNounish()
  //       && relative.node.interp.isPossessive()
  //       && uEq(relative.node.rel, 'det')
  //     ) {
  //       // Сергія, чию смерть
  //       relation = 'nmod'
  //     } else {
  //       relation = relative.incomingArrows.find(x => !uEq(x.attrib, 'conj')).attrib  // todo
  //     }
  //     // antecedentArrow.start.addIncomingArrow(relative, relation)
  //   })
  // }

  // if (relRoot === node) {

  //   let subject = node.children.find(x => uEqSome(x.node.rel, ['nsubj'/* , 'csubj' */]))
  //   if (subject) {
  //     // todo: csubj?
  //     subject.node.edeps.push(buildDep(antecedent.node, 'nsubj'))
  //   } else {
  //     throw new Error(`Notice this!`)
  //   }
  // } else {
  //   if (node.node.rel !== 'advmod'/*  && relRoot.children.some(x => x === node) */) {
  //     // let headOfTheRelative = node.parent
  //     let rel = node.node.rel
  //     if (antecedent.node.interp.isNounish() && uEq(node.node.rel, 'det')) {
  //       // Сергія, чию смерть
  //       rel = 'nmod'
  //     }
  //     antecedent.node.edeps.push(buildDep(node.parent.node, rel))
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
    node.walkBackMu(({ attrib: rel }) => uEq(rel, 'xcomp'))
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
    let firstConjChain = node.walkBackMu(({ attrib: rel }) => uEq(rel, 'conj') && rel !== 'conj:parataxis')
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
    let topConj = node.walkBackMu(({ attrib: rel }) => uEq(rel, 'conj'))
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
export function loadEnhancedGraphFromTokens(nodes: Array<EnhancedNode>) {
  for (let node of nodes) {
    for (let edep of node.node.edeps) {
      if (node.node.id === edep.headId) {
        console.error(node.node.id)
        console.error(nodes)
      }
      node.addIncomingArrow(nodes[edep.headIndex], edep.relation)
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
export function findRelcls(relative: EnhancedNode) {
  return relative.pathsBackWidth({
    cutAndFilter: path => uEqSome(last(path).attrib, ['conj']),
    cutAndInclude: path => uEqSome(last(path).attrib, ['acl']),
  })
    .filter(x => uEqSome(last(x).attrib, ['acl']))
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
