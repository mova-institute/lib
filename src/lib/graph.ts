import { mu, Mu } from '../mu'

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

  root() {
    return mu(this.walkUp0()).last()
  }

  hasChildren() {
    return !!this.children.length
  }
}

////////////////////////////////////////////////////////////////////////////////
// naive, callstack-unbounded
export function* walkDepth<T>(node: GraphNode<T>, yieldFirst = true): IterableIterator<GraphNode<T>> {
  yield node
  for (let child of node.children) {
    yield* walkDepth(child)
  }
}
