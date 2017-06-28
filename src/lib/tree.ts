import { mu } from '../mu'

export class TreeNode<T> {
  parent?: TreeNode<T>
  children = new Array<TreeNode<T>>()

  constructor(public node: T) { }

  isRoot() {
    return !this.parent
  }

  *walkUp() {
    for (let p = this.parent; p; p = p.parent) {
      yield p
    }
  }

  root() {
    return mu(this.walkUp()).last()
  }

  hasChildren() {
    return !!this.children.length
  }
}

////////////////////////////////////////////////////////////////////////////////
// naive, callstack-unbounded
export function* walkDepth<T>(node: TreeNode<T>, yieldFirst = true): IterableIterator<TreeNode<T>> {
  yield node
  for (let child of node.children) {
    yield* walkDepth(child)
  }
}
