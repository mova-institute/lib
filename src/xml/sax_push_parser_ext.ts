import {SaxPushParser} from 'libxmljs'

export class SaxPushParserExt extends SaxPushParser {
	
	constructor() {
		super();console.log();
	}
	
	on(event: string, listener: Function): SaxPushParserExt {
		console.log('on');
		//super.on(event, listener);
		return this;
	}
	start_element_ns() {
		console.log('start_element_ns');
	}
	
	chichichi(){
		console.log('chichichi');
	}
}