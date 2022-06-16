import { DoubleLinkedNode } from './double_linked_node'
import { DoubleLinkedList } from './double_linked_list'



export class CacheMap<K, V> {
  private map = new Map<K, DoubleLinkedNode<V>>()
  private list = new DoubleLinkedList<V>()

  constructor(private maxSize: number, private creator: (key: K) => V) {
  }

  get(key: K) {
    let node = this.map.get(key)
    if (node) {
      this.list.putFront(node)
      return node.value()
    }

    let ret = this.creator(key)
    this.map.set(key, this.list.pushFront(ret))
    if (this.list.size > this.maxSize) {
      this.list.popBack()
    }

    return ret
  }
}
