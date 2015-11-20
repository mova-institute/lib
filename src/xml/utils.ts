import {INode, IElement, IDocument} from './interfaces'

export const NS = {
  xml: 'http://www.w3.org/XML/1998/namespace',
  tei: 'http://www.tei-c.org/ns/1.0',
  mi: 'https://mova.institute/ns/mi/1',
};


////////////////////////////////////////////////////////////////////////////////
export function escape(val: string) {   // todo
  return val.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

////////////////////////////////////////////////////////////////////////////////
export function namePrefixed(prefix: string, name: string) {
  return prefix ? `${prefix}:${name}` : name;
}

////////////////////////////////////////////////////////////////////////////////
export function nameNs(ns: string, name: string) {
  return `{${ns}}${name}`;
}

////////////////////////////////////////////////////////////////////////////////
export function nameNsEl(el: Element) {
  if (el.namespaceURI) {
    return nameNs(el.namespaceURI, el.localName);
  }
  let [prefix, localName] = el.tagName.split(':');
  let ns = el.ownerDocument.documentElement.getAttribute(`xmlns:${prefix}`);

  if (!localName || !ns) {
    throw 'Not implemented';
  }

  return nameNs(ns, localName);
}

////////////////////////////////////////////////////////////////////////////////
export function tagStr(open: boolean, prefix: string, elem: string, attrs = new Map()) {
  if (!open) {
    return `</${namePrefixed(prefix, elem) }>`;
  }
  let toret = `<${namePrefixed(prefix, elem) }`;
  for (var [key, value] of attrs.entries()) {
    toret += ` ${key}="${value}"`;
  }
  toret += '>';

  return toret;
}

////////////////////////////////////////////////////////////////////////////////
export function libxmlSaxAttrs(attrs: Array<[string, string, string, string]>) {
  let toret = new Map();
  for (let [name, , , val] of attrs) {
    toret.set(name, val);
  }

  return toret;
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDepthEl(node: INode, onEnter: Function, onLeave?: Function) {
  let onEnterFiltered = node => {
    if (isElement(node)) {
      onEnter(node);
    }
  }
  traverseDepth(node, onEnterFiltered, onLeave);
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDepth(node: INode, onEnter: Function, onLeave?: Function) {
  let directive = onEnter(node);
  if (directive === false) {
    return false;
  }
  if (directive !== 'skip') {
    //console.log('entered for - ', node.firstChild && node.firstChild.nodeName);
    for (let cur = node.firstChild, next = cur && cur.nextSibling;
         cur;
         cur = next, next = next && next.nextSibling) {
      if (traverseDepth(cur, onEnter, onLeave) === false) {
        return false;
      }
    }
  }

  onLeave && onLeave(node);
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDocumentOrder(node: INode, onEnter: Function, onLeave?: Function) {
  for (var curNode = node; curNode; curNode = curNode.nextSibling) {
    if (traverseDepth(curNode, onEnter, onLeave) === false) {
      return false;
    }
  }
  for (curNode = node && node.parentNode; curNode; curNode = curNode.parentNode) {
    if (curNode.nextSibling) {
      if (traverseDocumentOrder(curNode.nextSibling, onEnter, onLeave) === false) {
        return false;
      }
      break;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function nextEl(base: Element, predicate: Function) {
  for (var toret = base.nextElementSibling; toret; toret = base.nextElementSibling) {
    if (predicate(toret)) {
      break;
    }
  }

  return toret;
}

////////////////////////////////////////////////////////////////////////////////
export function isRoot(el: Node): boolean {
  return el === el.ownerDocument.documentElement;
}

////////////////////////////////////////////////////////////////////////////////
/*export function lang(node: Node): string {
  if (node.nodeType !== node.ELEMENT_NODE) {
    return lang(node.parentElement);
  }
  let el = <Element>node;
  let hasAttr = el.hasAttributeNS(NS.xml, 'lang');
  if (!hasAttr) {
    if (isRoot(node)) {
      return null;
    }
    if (!node.parentElement)
      console.log('uuu', el.tagName);
    return lang(node.parentElement);
  }

  return el.getAttributeNS(NS.xml, 'lang');
}*/

////////////////////////////////////////////////////////////////////////////////
export function lang2(node: Node): string {
  if (node.nodeType !== node.ELEMENT_NODE) {
    return lang2(node.parentElement);
  }
  let el = <Element>node;
  let toret = el.getAttribute('xml:lang');
  if (!toret) {
    if (isRoot(el)) {
      return '';
    }

    return lang2(el.parentElement);
  }

  return toret;
}

////////////////////////////////////////////////////////////////////////////////
export function replace(what: Node, replacement: Node) {
  what.parentNode.replaceChild(replacement, what);
}

////////////////////////////////////////////////////////////////////////////////
export function isElement(node: INode) {
  return node.nodeType === node.ELEMENT_NODE;
}

////////////////////////////////////////////////////////////////////////////////
export function isText(node: INode) {
  return node.nodeType === node.TEXT_NODE;
}

////////////////////////////////////////////////////////////////////////////////
export function insertBefore(toInsert: Node, beforeThis: Node) {
  beforeThis.parentNode.insertBefore(toInsert, beforeThis);
}

////////////////////////////////////////////////////////////////////////////////
export function insertAfter(toInsert: Node, afterThis: Node) {
  afterThis.parentNode.insertBefore(toInsert, afterThis.nextSibling);
}

////////////////////////////////////////////////////////////////////////////////
export function remove(node: Node) {
  node.parentNode.removeChild(node)
}
