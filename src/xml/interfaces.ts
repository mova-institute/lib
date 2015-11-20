// todo: when get, when ()?

export interface IDocument {
	documentElement: IElement;
	createElement(name: string): IElement;
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
	isElement(): boolean;
	isText(): boolean;
	isRoot(): boolean;
	replace(replacement: INode);
	insertBefore(newNode: INode): INode;	// todo
	remove();
	lang(): string;
}

export interface IElement extends INode {
	localName: string;
	getAttribute(name: string): string;
	setAttribute(name: string, value: string);
	appendChild(child: INode): INode;
	nameNs(): string;
}