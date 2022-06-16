export class DoubleLinkedNode<T> {
  private prev: DoubleLinkedNode<T> | undefined
  private next: DoubleLinkedNode<T> | undefined

  constructor(private wrapee: T) {}

  value() {
    return this.wrapee
  }

  remove() {
    if (this.prev) {
      this.prev.next = this.next
    }
    if (this.next) {
      this.next.prev = this.prev
    }
    this.prev = this.next = undefined

    return this
  }

  putBefore(node: DoubleLinkedNode<T>) {
    this.remove()
    if (node.prev) {
      node.prev.next = this
    }
    node.prev = this
    this.prev = node.prev
    this.next = node

    return this
  }

  putAfter(node: DoubleLinkedNode<T>) {
    this.remove()
    if (node.next) {
      node.next.prev = this
    }
    node.next = this
    this.prev = node
    this.next = node.next

    return this
  }
}
