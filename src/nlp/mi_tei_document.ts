import { $t } from './text_token'
import { AbstractElement } from '../xml/xmlapi/abstract_element'

export const NS = {
  xml: 'http://www.w3.org/XML/1998/namespace',
  xhtml: 'http://www.w3.org/1999/xhtml',
  tei: 'http://www.tei-c.org/ns/1.0',
  mi: 'http://mova.institute/ns/corpora/0.1',
}

export function $d(root: AbstractElement) {
  return new MiTeiDocument(root)
}

export class MiTeiDocument {
  constructor(private root: AbstractElement) {}

  getTitle() {
    let title = this.root.evaluateElement('//tei:title[1]', NS)
    if (title) {
      return title
        .evaluateElements('//mi:w_', NS)
        .map((x) => $t(x).text())
        .toArray()
        .join(' ')
        .trim()
    }
  }

  getTransforms() {
    let transforms = this.root.evaluateElement('//mi:transform', NS)
    if (transforms) {
      let apply = transforms.attribute('apply')
      if (apply) {
        return apply.split(' ')
      }
    }
    return []
  }

  getBody() {
    return this.root.evaluateElement('/tei:TEI/tei:text/tei:body', NS)
  }

  getTags() {
    let tags = this.getTagsString()
    if (tags) {
      return tags.split(' ')
    }
    return []
  }

  getMeta() {
    let metaEl = this.root.evaluateElement('//mi:meta', NS)
    if (metaEl) {
      return metaEl.attributesObj()
    }
  }

  hasTags() {
    return this.getTagsString()
  }

  private getTagsString() {
    let meta = this.root.evaluateElement('/tei:TEI/tei:teiHeader/mi:meta')
    if (meta) {
      return meta.attribute('tags')
    }
  }
}
