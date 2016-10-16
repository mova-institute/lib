import { DoubleLinkedNode } from './double_linked_node'

export class DoubleLinkedList<T> {
  private head: DoubleLinkedNode<T>
  private tail: DoubleLinkedNode<T>
  size = 0
  constructor() {
  }

  pushFront(value: T) {
    let node = new DoubleLinkedNode(value)
    if (!this.head) {
      this.head = this.tail = node
    } else {
      this.head.putBefore(node)
    }
    ++this.size

    return node
  }

  putFront(node: DoubleLinkedNode<T>) {
    this.head = node.putBefore(this.head)
  }

  popFront() {
    if (this.head) {
      --this.size
      return this.head.remove().value()
    }
  }

  popBack() {
    if (this.tail) {
      --this.size
      return this.tail.remove().value()
    }
  }
}
