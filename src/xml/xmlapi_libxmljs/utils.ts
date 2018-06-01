import { LibxmljsElement } from './libxmljs_element'
import { LibxmljsNode } from './libxmljs_node'
import { LibxmljsAttribute } from './libxmljs_attribute'



////////////////////////////////////////////////////////////////////////////////
export function nodeOrElement(wrapee): LibxmljsNode | LibxmljsElement {
  switch (wrapee.type()) {
    case 'element':
      return new LibxmljsElement(wrapee)
    case 'text':
    case 'cdata':
    case 'comment':
      return new LibxmljsNode(wrapee)
    default:
      throw new Error('Unexpected node type')
  }
}

////////////////////////////////////////////////////////////////////////////////
export function nodeOrElementOrNull(wrapee): LibxmljsNode | LibxmljsElement {
  if (!wrapee) {
    return null
  }
  return nodeOrElement(wrapee)
}

////////////////////////////////////////////////////////////////////////////////
export function nodeOrElementOrAttribute(wrapee): LibxmljsNode | LibxmljsElement | LibxmljsAttribute {
  switch (wrapee.type()) {
    case 'element':
      return new LibxmljsElement(wrapee)
    case 'text':
    case 'cdata':
    case 'comment':
      return new LibxmljsNode(wrapee)
    case 'attribute':
      return new LibxmljsAttribute(wrapee)
    default:
      throw new Error('Unexpected node type')
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isNode(wrapee) {
  switch (wrapee.type()) {
    case 'element':
    case 'text':
    case 'cdata':
    case 'comment':
      return true
    case 'attribute':
      return false
    default:
      throw new Error('Unexpected node type')
  }
}
