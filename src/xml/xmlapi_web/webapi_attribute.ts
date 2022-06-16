import { AbstractAttribute } from '../xmlapi/abstract_attribute'
import { isOddball } from '../xmlapi/utils'



////////////////////////////////////////////////////////////////////////////////
export class WebapiAttribute extends AbstractAttribute {
  constructor(private wrapee: Node) {
    super()
  }

  namespaceUri() {
    return this.wrapee instanceof Element ? this.wrapee.namespaceURI : undefined
  }

  namespacePrefix() {
    return (this.wrapee as any).prefix
  }

  nameLocal() {
    return this.wrapee instanceof Element ? this.wrapee.localName : undefined
  }

  namePrefixed() {
    return this.wrapee.nodeName
  }

  value() {
    return this.wrapee.textContent
  }

  equals(other: WebapiAttribute) {
    return !isOddball(other) && other.wrapee === this.wrapee
  }
}
