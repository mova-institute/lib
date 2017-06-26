export class TreeNode<T> {
  parent?: TreeNode<T>
  children = new Array<TreeNode<T>>()

  constructor(public node: T){}

  isRoot() {
    return !this.parent
  }
}
