import {INode, IElement, IDocument} from './api/interfaces'

export const NS = {
  xml: 'http://www.w3.org/XML/1998/namespace',
  tei: 'http://www.tei-c.org/ns/1.0',
  mi: 'https://mova.institute/ns/mi/1',
};


////////////////////////////////////////////////////////////////////////////////
export function cantBeXml(str: string) {
  return !/^\s*\</.test(str);
}

////////////////////////////////////////////////////////////////////////////////
export function escape(val: string) {   // todo
  return val.replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

////////////////////////////////////////////////////////////////////////////////
export function xmlNsResolver(prefix: string) {
  return NS[prefix] || null;
}

////////////////////////////////////////////////////////////////////////////////
export function nameNs(ns: string, name: string) {
  return `{${ns}}${name}`;
}

////////////////////////////////////////////////////////////////////////////////
export function namePrefixed(prefix: string, name: string) {
  return prefix ? `${prefix}:${name}` : name;
}

////////////////////////////////////////////////////////////////////////////////
export function removeXmlns(xmlstr: string) {
  return xmlstr.replace(/ xmlns(:\w+)?="[^"]+"/g, '')
}

////////////////////////////////////////////////////////////////////////////////
export function encloseInRoot(xmlstr: string, defaultNs: string, rootName = 'mi:fragment') {
  let out = '<' + rootName;
  if (NS[defaultNs]) {
    out += ' xmlns="' + NS[defaultNs] + '"';
  }
  for (let prefix in NS) {
    if (prefix !== defaultNs) {
      out += ' xmlns:' + prefix + '="' + NS[prefix] + '"';
    }
  }
  out += '>\n' + xmlstr + '\n</' + rootName + '>';
  
  return out;
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
export function traverseDepthEl(node: INode, onEnter: (el: IElement) => any, onLeave?: (el: IElement) => any) {
  traverseDepth(node, callbackIfElement(onEnter), callbackIfElement(onLeave));
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDepth(node: INode, onEnter: (el: INode) => any, onLeave?: (el: INode) => any) {
  let directive = onEnter(node);
  if (directive === false) {
    return false;
  }
  if (directive !== 'skip') {
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
export function traverseDocumentOrder(node: INode, onEnter: (el: INode) => any, onLeave?: (el: INode) => any) {
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
export function traverseDocumentOrderEl(node: INode, onEnter: (el: IElement) => any, onLeave?: (el: IElement) => any) {
  traverseDocumentOrder(node, callbackIfElement(onEnter), callbackIfElement(onLeave));
}

////////////////////////////////////////////////////////////////////////////////
export function walkUpUntil(node, predicate: (node) => boolean) {
  while (node && predicate(node.parentNode)) {
    node = node.parentNode;
  }
  
  return node;
}

////////////////////////////////////////////////////////////////////////////////
export function nLevelsDeep(node, n: number) {
  while (node && n--) {
    node = node.firstChild;  // todo: element?
  }
  
  return node;
}

// ////////////////////////////////////////////////////////////////////////////////
// export function nextEl(base: Element, predicate: Function) {
//   for (var toret = base.nextElementSibling; toret; toret = base.nextElementSibling) {
//     if (predicate(toret)) {
//       break;
//     }
//   }

//   return toret;
// }

////////////////////////////////////////////////////////////////////////////////
export function lang(node: INode): string {
  if (!node.isElement()) {
    return lang(node.parentNode);
  }
  let el = <IElement>node;
  let toret = el.getAttribute('lang') || el.getAttribute('xml:lang'); // todo
  if (!toret) {
    if (el.isRoot()) {
      return '';
    }

    return lang(el.parentNode);
  }

  return toret;
}






////////////////////////////////////////////////////////////////////////////////
function callbackIfElement(cb) {
  return node => {
    if (cb && node.isElement()) {
      return cb(node);
    }
  }
}