import {remove} from '../xml/utils'

export class XmlElement {
	constructor(protected element: HTMLElement) {
		
	}
	
	remove() {
		remove(this.element);
	}
}