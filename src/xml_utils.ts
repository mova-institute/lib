const NS = {
  xml: 'http://www.w3.org/XML/1998/namespace'
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDepth(node: Node, onEnter, onLeave?) {
  let directive = onEnter(node);
  if (directive === false) {
    return false;
  }
  if (directive !== 'skip') {
    for (let cur = node.firstChild, next = cur && cur.nextSibling; cur;
         cur = next, next = next && next.nextSibling) {
      if (traverseDepth(cur, onEnter, onLeave) === false) {
        return false;
      }
    }
  }

  onLeave && onLeave(node);
}

////////////////////////////////////////////////////////////////////////////////
export async function traverseDocumentOrder(node: Node, onEnter, onLeave?) {
  for (let curNode = node; curNode; curNode = curNode.nextSibling) {
    if (await traverseDepth(curNode, onEnter, onLeave) === false) {
      return true;
    }
  }
  if (node && node.parentNode) {
    if (await traverseDocumentOrder(node.parentNode.nextSibling, onEnter, onLeave) === false) {
      return false;
    }
  }
}

////////////////////////////////////////////////////////////////////////////////
export function isRoot(el: Node): boolean {
  return el === el.ownerDocument.documentElement;
}

////////////////////////////////////////////////////////////////////////////////
export function lang(node: Node): string {
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
}

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
export function isElement(node: Node) {
  return node.nodeType === node.ELEMENT_NODE
}

////////////////////////////////////////////////////////////////////////////////
export function isText(node: Node) {
  return node.nodeType === node.TEXT_NODE;
}

////////////////////////////////////////////////////////////////////////////////
export function insertBefore(insert: Node, beforeThis: Node) {
  beforeThis.parentNode.insertBefore(insert, beforeThis);
}

////////////////////////////////////////////////////////////////////////////////
export function remove(node: Node) {
  node.parentNode.removeChild(node)
}
