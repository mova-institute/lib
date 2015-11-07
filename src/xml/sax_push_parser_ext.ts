import {SaxPushParser} from 'libxmljs'

export class SaxPushParserExt {
	private parser = new SaxPushParser();
	private listeners = new Array<Function>();
	private textBuf = '';
	private curElem = [];

	constructor() {
		this.initParser();
	}

	push(chunk: string) {
		this.parser.push(chunk);
	}

	on(event: string, listener: Function) {
		if (event === 'startElementNSExt') {
			this.listeners.push(listener);
		}
		else {
			this.parser.on(event, listener);
		}

		return this;
	}

	private initParser() {
		this.parser.on('startElementNS', (elem, attrs, prefix, uri, ns) => {
			this.emitStartIfBuffered();
			this.curElem = [elem, attrs, prefix, uri, ns];

		}).on('characters', chars => {
			this.textBuf += chars;
		}).on('endElementNS', (elem, prefix, uri) => {
			this.emitStartIfBuffered();
			this.curElem = [];
		});
	}
	
	private emitStartIfBuffered() {
		if (this.curElem.length) {
			//for (let listener of this.listeners) {
				this.listeners[0](this.curElem[0], this.curElem[1], this.curElem[2],
								 this.curElem[3], this.curElem[4], this.textBuf);
			///}
		}
		this.textBuf = '';
	}
}