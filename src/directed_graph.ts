import { mu } from './mu'
import { last } from './lang'


////////////////////////////////////////////////////////////////////////////////
export type DirectedGraphPath<NodeAttrib, ArrowAttrib> = Array<Arrow<NodeAttrib, ArrowAttrib>>

////////////////////////////////////////////////////////////////////////////////
export interface PathTraversalParams<NodeAttrib, ArrowAttrib> {
  cutAndFilter?: (path: DirectedGraphPath<NodeAttrib, ArrowAttrib>) => any
  cutAndInclude?: (path: DirectedGraphPath<NodeAttrib, ArrowAttrib>) => any
}

////////////////////////////////////////////////////////////////////////////////
export interface Arrow<NodeAttrib, ArrowAttrib> {
  start: DirectedGraphNode<NodeAttrib, ArrowAttrib>
  end: DirectedGraphNode<NodeAttrib, ArrowAttrib>
  attrib: ArrowAttrib
}

////////////////////////////////////////////////////////////////////////////////
export class DirectedGraphNode<NodeAttrib, ArrowAttrib> {
  readonly incomingArrows = new Array<Arrow<NodeAttrib, ArrowAttrib>>()
  readonly outgoingArrows = new Array<Arrow<NodeAttrib, ArrowAttrib>>()

  constructor(
    public node: NodeAttrib
  ) {
  }

  get incomingNodes() {
    return mu(this.incomingArrows).map(x => x.start)
  }

  get outgoingNodes() {
    return mu(this.outgoingArrows).map(x => x.end)
  }

  hasIncoming() {
    return !!this.incomingArrows.length
  }

  hasOutgoing() {
    return !!this.outgoingArrows.length
  }

  addIncomingArrow(from: this, attrib: ArrowAttrib) {
    if (from === this) {
      throw new Error(`Self-loops are currently unsupported`)
    }

    let arrow = {
      start: from,
      end: this,
      attrib,
    }
    this.incomingArrows.push(arrow)
    from.outgoingArrows.push(arrow)

    return this
  }

  addOutgoingArrow(to: this, attrib: ArrowAttrib) {
    to.addIncomingArrow(this, attrib)
    return this
  }

  *walkBack(parentSelector: (arrow: Arrow<NodeAttrib, ArrowAttrib>) => any) {
    let cur = this as DirectedGraphNode<NodeAttrib, ArrowAttrib>
    while (true) {
      let ret = cur.incomingArrows.find(parentSelector)
      if (!ret) {
        return
      }
      yield ret
      cur = ret.start
    }
  }

  walkBackMu(parentSelector: (arrow: Arrow<NodeAttrib, ArrowAttrib>) => any) {
    return mu(this.walkBack(parentSelector))
  }

  *pathsWidth(
    direction: 'forward' | 'backward',
    params?: PathTraversalParams<NodeAttrib, ArrowAttrib>,
  ) {
    let inOrOutArrows: keyof DirectedGraphNode<NodeAttrib, ArrowAttrib> =
      direction === 'backward' ? 'incomingArrows' : 'outgoingArrows'
    let startOrEnd: keyof Arrow<NodeAttrib, ArrowAttrib> =
      direction === 'backward' ? 'start' : 'end'

    let activePaths = new Set<Array<Arrow<NodeAttrib, ArrowAttrib>>>()
    for (let arrow of this[inOrOutArrows]) {
      let firstStep = [arrow]
      if (!params || !params.cutAndFilter || !params.cutAndFilter(firstStep)) {
        if (!params || !params.cutAndInclude || !params.cutAndInclude(firstStep)) {
          activePaths.add(firstStep)
        }
        yield firstStep
      }
    }

    while (activePaths.size) {
      for (let path of [...activePaths]) {
        for (let newSegment of last(path)[startOrEnd][inOrOutArrows]) {
          if (!path.includes(newSegment)) {  // no cycle
            let newPath = [...path, newSegment]
            if (!params || !params.cutAndFilter || !params.cutAndFilter(newPath)) {
              if (!params || !params.cutAndInclude || !params.cutAndInclude(newPath)) {
                activePaths.add(newPath)
              }
              yield newPath
            }
          }
        }
        activePaths.delete(path)
      }
    }
  }

  pathsForwardWidth(params?: PathTraversalParams<NodeAttrib, ArrowAttrib>) {
    return mu(this.pathsWidth('forward', params))
  }

  pathsBackWidth(params?: PathTraversalParams<NodeAttrib, ArrowAttrib>) {
    return mu(this.pathsWidth('backward', params))
  }
}
