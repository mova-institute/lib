import { mu, Mu } from './mu'

export class GraphNode<T> {
  parents = new Array<GraphNode<T>>()
  children = new Array<GraphNode<T>>()

  constructor(public node: T) { }

  addParent(node: GraphNode<T>) {
    this.parents.push(node)
  }

  get parent() {
    return this.parents[0]
  }

  isRoot() {
    return !this.parent
  }

  ancestors0() {
    return mu(this.walkUp0())
  }

  *walkUp0() {
    for (let p = this.parent; p; p = p.parent) {
      yield p
    }
  }

  *walkThisAndUp0() {
    for (let p = this; p; p = p.parent as any) { // todo
      yield p
    }
  }

  root() {
    return mu(this.walkUp0()).last()
  }

  hasChildren() {
    return !!this.children.length
  }
}

////////////////////////////////////////////////////////////////////////////////
// naive, callstack-unbounded
export function* walkDepth<T>(node: GraphNode<T>, cutOff?: (node: GraphNode<T>) => boolean): IterableIterator<GraphNode<T>> {
  if (cutOff && cutOff(node)) {
    return
  }
  yield node
  for (let child of node.children) {
    yield* walkDepth(child, cutOff)
  }
}

////////////////////////////////////////////////////////////////////////////////
// naive, callstack-unbounded
export function* walkDepthNoSelf<T>(node: GraphNode<T>, cutOff?: (node: GraphNode<T>) => boolean): IterableIterator<GraphNode<T>> {
  for (let child of node.children) {
    yield* walkDepth(child, cutOff)
  }
}
