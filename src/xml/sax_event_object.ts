import {tagStr} from '../xml/utils'

export class SaxEventObject {
	
	constructor(
		public type: string,
		public el: string,
		public text?: string,
		public attr?: Map<string, string>,
		public prefix?: string,
		public elem?: string,
		public uri?: string,
		public ns?: Array<any>) {}
	
	toString() {
		return `${this.type}-${this.el}-${this.text || ''}`;
	}
}
