import { AbstractAttribute } from '../xmlapi/abstract_attribute'
import { isOddball } from '../xmlapi/utils'

export class LibxmljsAttribute extends AbstractAttribute {
  constructor(private wrapee) {
    super()
  }

  namespaceUri() {
    let ns = this.wrapee.namespace()
    if (ns) {
      return ns.href()
    }
    return null
  }

  namespacePrefix() {
    let ns = this.wrapee.namespace()
    if (ns) {
      return ns.prefix()
    }
    return null
  }

  nameLocal() {
    return this.wrapee.name() as string
  }

  namePrefixed() {
    let ns = this.wrapee.namespace()
    if (ns && ns.prefix()) {
      return ns.prefix() + ':' + this.nameLocal()
    }

    return this.nameLocal()
  }

  value() {
    return this.wrapee.value().toString() as string
  }

  equals(other: LibxmljsAttribute) {
    return !isOddball(other) && other.wrapee === this.wrapee
  }
}
