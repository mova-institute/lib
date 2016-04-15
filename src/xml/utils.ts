import {INode, IElement} from './api/interface';

export const NS = {
  xml: 'http://www.w3.org/XML/1998/namespace',
  xhtml: 'http://www.w3.org/1999/xhtml',
  tei: 'http://www.tei-c.org/ns/1.0',
  mi: 'http://mova.institute/ns/corpora/0.1',
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
  return xmlstr.replace(/ xmlns(:\w+)?="[^"]+"/g, '');
}

////////////////////////////////////////////////////////////////////////////////
export function removeRoot(xmlstr: string) {
  return xmlstr.replace(/^\s*(<\?xml[^>]+\?>)?\s*<[^>]+>/, '').replace(/<\/[^>]+>\s*$/, '');
}

////////////////////////////////////////////////////////////////////////////////
export function encloseInRoot(xmlstr: string, rootName = 'root') {
  return `<${rootName}>${xmlstr}</${rootName}>`;
}

////////////////////////////////////////////////////////////////////////////////
export function encloseInRootNs(value: string, rootName = 'mi:fragment', ns = ['tei', 'mi']) {
  let ret = '<' + rootName;
  if (NS[ns[0]]) {
    ret += ' xmlns="' + NS[ns[0]] + '"';
  }
  for (let i = 1; i < ns.length; ++i) {
    ret += ' xmlns:' + ns[i] + '="' + NS[ns[i]] + '"';
  }
  ret += '>\n' + value + '\n</' + rootName + '>';

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function encloseInRootNsIf(value: string, rootName = 'mi:fragment', ns = ['tei', 'mi']) {
  if (cantBeXml(value)) {
    value = encloseInRootNs(value, rootName, ns);
  }

  return value;
}


////////////////////////////////////////////////////////////////////////////////
export function tagStr(open: boolean, prefix: string, elem: string, attrs = new Map()) {
  if (!open) {
    return `</${namePrefixed(prefix, elem)}>`;
  }
  let ret = `<${namePrefixed(prefix, elem)}`;
  for (let [key, value] of attrs.entries()) {
    ret += ` ${key}="${value}"`;
  }
  ret += '>';

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function libxmlSaxAttrs(attrs: Array<[string, string, string, string]>) {
  let ret = new Map();
  for (let [name, , , val] of attrs) {
    ret.set(name, val);
  }

  return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDepthEl(node: INode, onEnter: (el: IElement) => any, onLeave?: (el: IElement) => any) {
  traverseDepth(node, callbackIfElement(onEnter), callbackIfElement(onLeave));
}

////////////////////////////////////////////////////////////////////////////////
export type TraverseDirective = 'skip' | 'stop';
export interface ITraverseCallback {
  (el: INode): TraverseDirective;
}
export function traverseDepth(node: INode, onEnter: ITraverseCallback, onLeave?: ITraverseCallback) {
  let directive = onEnter(node);
  if (directive === 'stop') {
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

  if (onLeave) {
    onLeave(node);
  }
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDocumentOrder(node: INode, onEnter: ITraverseCallback, onLeave?: ITraverseCallback) {
  let curNode = node;
  for (; curNode; curNode = curNode.nextSibling) {
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
export function nextElDocumentOrder(context: IElement, elsOfInterest?: Set<string>) {
  let ret: IElement = null;
  traverseDocumentOrder(context, callbackIfElement(el => {
    if (!context.equals(el) && (!elsOfInterest || !elsOfInterest.size || elsOfInterest.has(el.nameNs()))) {
      ret = el;
      return 'stop';
    }
  }));

  return ret;
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

////////////////////////////////////////////////////////////////////////////////
export function lang(node: INode): string {
  if (!node.isElement()) {
    return lang(node.parentNode);
  }
  let el = <IElement>node;
  let ret = el.getAttribute('lang') || el.getAttribute('xml:lang'); // todo
  if (!ret) {
    if (el.isRoot()) {
      return '';
    }

    return lang(el.parentNode);
  }

  return ret;
}






////////////////////////////////////////////////////////////////////////////////
function callbackIfElement(cb: (el: IElement) => TraverseDirective) {
  return node => {
    if (cb && node.isElement()) {
      return cb(node);
    }
  };
}

////////////////////////////////////////////////////////////////////////////////
// taken from https://github.com/vkiryukhin/pretty-data
export function pretty(xmlstr: string) {
  let shift = ['\n']; // array of shifts
  // var step = '  ';
  // var maxdeep = 100;  // nesting level

  // initialize array with shifts //
  for (let i = 0; i < 100; ++i) {
    shift.push(shift[i] + '  ');
  }

  let ar = xmlstr
    .replace(/>\s{0,}</g, '><')
    .replace(/</g, '~::~<')
    .replace(/xmlns\:/g, '~::~xmlns:')
    .replace(/xmlns\=/g, '~::~xmlns=')
    .split('~::~');

  let inComment = false;
  let deep = 0;
  let str = '';
  for (let i = 0; i < ar.length; i++) {
    // start comment or <![CDATA[...]]> or <!DOCTYPE //
    if (ar[i].search(/<!/) > -1) {
      str += shift[deep] + ar[i];
      inComment = true;
      // end comment  or <![CDATA[...]]> //
      if (ar[i].search(/-->/) > -1 || ar[i].search(/\]>/) > -1 || ar[i].search(/!DOCTYPE/) > -1) {
        inComment = false;
      }
    } else
      // end comment  or <![CDATA[...]]> //
      if (ar[i].search(/-->/) > -1 || ar[i].search(/\]>/) > -1) {
        str += ar[i];
        inComment = false;
      } else
        // <elm></elm> //
        if (/^<\w/.exec(ar[i - 1]) && /^<\/\w/.exec(ar[i]) && /^<[\w:\-\.\,]+/.exec(ar[i - 1])[0] === /^<\/[\w:\-\.\,]+/.exec(ar[i])[0].replace('/', '')) {
          str += ar[i];
          if (!inComment) {
            --deep;
          }
        } else
          // <elm> //
          if (ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) === -1 && ar[i].search(/\/>/) === -1) {
            str = !inComment ? str += shift[deep++] + ar[i] : str += ar[i];
          } else
            // <elm>...</elm> //
            if (ar[i].search(/<\w/) > -1 && ar[i].search(/<\//) > -1) {
              str = !inComment ? str += shift[deep] + ar[i] : str += ar[i];
            } else
              // </elm> //
              if (ar[i].search(/<\//) > -1) {
                str = !inComment ? str += shift[--deep] + ar[i] : str += ar[i];
              } else
                // <elm/> //
                if (ar[i].search(/\/>/) > -1) {
                  str = !inComment ? str += shift[deep] + ar[i] : str += ar[i];
                } else
                  // <? xml ... ?> //
                  if (ar[i].search(/<\?/) > -1) {
                    str += shift[deep] + ar[i];
                  } else
                    // xmlns //
                    if (ar[i].search(/xmlns\:/) > -1 || ar[i].search(/xmlns\=/) > -1) {
                      str += shift[deep] + ar[i];
                    }
                    else {
                      str += ar[i];
                    }
    }

  return (str[0] === '\n') ? str.slice(1) : str;
}

////////////////////////////////////////////////////////////////////////////////
export function sortChildElements(el: IElement, compare: (a: IElement, b: IElement) => number) {
  let childrenSorted = [...el.childElements()].sort(compare);
  for (let child of childrenSorted) {
    el.appendChild(child.remove());
  }
}
