////////////////////////////////////////////////////////////////////////////////
export function traverseDepth(el, callback) {
	if (callback(el, true) === false) {
		return false;
	}
	let children = el.children;
	for (let i = 0; i < children.length; ++i) {
		if (traverseDepth(children[i], callback) === false) {
			return false;
		}
	}
	callback(el, false);
}

////////////////////////////////////////////////////////////////////////////////
export function traverseDocumentOrder(node: Node, callback): boolean {
  for (let curNode = node; curNode; curNode = curNode.nextSibling) {
    if (traverseDepth(curNode, callback) === false) {
      return true;
    }
  }
  if (node && node.parentNode) {
    if (traverseDocumentOrder(node.parentNode.nextSibling, callback) === false) {
      return false;
    }
  }
}