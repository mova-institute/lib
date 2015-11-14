import {tagStr, namePrefixed, libxmlSaxAttrs, escape} from '../xml/utils'

export class SaxEventObject {
	private attrsMapCache: Map<string, string> = null;

	constructor(
		public type: string,
		public el: string,
		public text?: string,
		public attrsNs?: Array<[string, string, string, string]>,
		public prefix?: string,
		public elem?: string,
		public uri?: string,
		public ns?: Array<any>) { }

	toString() {
		return `${this.type}-${this.el}-${this.text || ''}`;
	}
	
	attrs() {
		if (!this.attrsMapCache) {
			this.attrsMapCache = libxmlSaxAttrs(this.attrsNs);
		}
		
		return this.attrsMapCache;
	}

	serialize() {
		if (this.type === 'end') {
			return `</${namePrefixed(this.prefix, this.elem) }>`;
		}

		if (this.type === 'start') {
			let toret = `<${namePrefixed(this.prefix, this.elem) }`;
			for (let [key, prefix, uri, value] of this.attrsNs) {
				toret += ` ${namePrefixed(prefix, key)}="${escape(value)}"`;
			}
			for (let [prefix, uri] of this.ns) {
				toret += ' xmlns';
				if (prefix) {
					toret += ':' + prefix;
				}
				toret += `="${uri}"`;
			}
			toret += '>' + escape(this.text);
			
			return toret;
		}
	}
}
