export interface IDocument {
	documentElement: IElement;
}

export interface INode {
	ownerDocument: IDocument;
	firstChild: INode;
	nextSibling: INode;
	parentNode: INode;
	nodeName: string;
	textContent: string;
	nodeType: number;
	ELEMENT_NODE: number;
	TEXT_NODE: number;
	ATTRIBUTE_NODE: number;
	COMMENT_NODE: number;
}

export interface IElement extends INode {
	localName: string;
	getAttribute(name: string): string;
	setAttribute(name: string, value: string);
}