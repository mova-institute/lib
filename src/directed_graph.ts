import { mu } from './mu'



////////////////////////////////////////////////////////////////////////////////
export interface Arrow<ArrowAttrib, NodeAttrib> {
  start: DirectedGraphNode<NodeAttrib, ArrowAttrib>
  end: DirectedGraphNode<NodeAttrib, ArrowAttrib>
  attrib: ArrowAttrib
}

////////////////////////////////////////////////////////////////////////////////
export class DirectedGraphNode<NodeAttrib, ArrowAttrib> {
  private arrows = new Array<Arrow<ArrowAttrib, NodeAttrib>>()

  constructor(
    public node: NodeAttrib
  ) {

  }

  get incomingArrows() {
    return this.arrows.filter(x => x.end === this)
  }

  get outgoingArrows() {
    return this.arrows.filter(x => x.start === this)
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

  walkBack(parentSelector: (arrow: Arrow<ArrowAttrib, NodeAttrib>) => any) {
    return mu(this.walkBack_(parentSelector))
  }

  addIncomingArrow(from: this, attrib: ArrowAttrib) {
    let arrow = {
      start: from,
      end: this,
      attrib,
    }
    this.arrows.push(arrow)
    from.arrows.push(arrow)

    return this
  }

  addOutgoingArrow(to: this, attrib: ArrowAttrib) {
    to.addIncomingArrow(this, attrib)
    return this
  }

  private *walkBack_(parentSelector: (arrow: Arrow<ArrowAttrib, NodeAttrib>) => any) {
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
}
