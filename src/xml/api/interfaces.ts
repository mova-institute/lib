// todo: when get, when ()?

export interface IDocument {
	documentElement: IElement;
	createElement(name: string): IElement;
	serialize(): string;
	xpath(xpath: string): any; // todo
}

export interface INode {
	equals(other: INode): boolean;
	ownerDocument: IDocument;
	firstChild: INode;
	nextSibling: INode;
	parentNode: INode;
	nodeName: string;
	textContent: string;
	isElement(): boolean;
	isText(): boolean;
	isRoot(): boolean;
	replace(replacement: INode);
	insertBefore(newNode: INode): INode;	// todo
	insertAfter(newNode: INode);
	remove();
	lang(): string;
	is(name: string): boolean;
}

export interface IElement extends INode {
	localName: string;
	getAttribute(name: string): string;
	setAttribute(name: string, value: any);
	appendChild(child: INode): INode;
	nameNs(): string;
	//isNs(otherName: string): boolean;
	nextElementSibling: IElement;
	lastChild: INode;
	childElements(): Iterable<IElement>;
	childElement(index: number): IElement;
}