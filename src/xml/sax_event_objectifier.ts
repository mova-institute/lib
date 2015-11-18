import {SaxEventObject} from './sax_event_object'
import {nameNs} from '../xml/utils'
import {Transform} from 'stream'
import {SaxParserExtBase, SaxParserExt, SaxPushParserExt} from '../xml/sax_push_parser_ext'



export class SaxEventObjectifier extends Transform {
	private parser: SaxParserExtBase;

	constructor(/*sync = false*/) {
		super({
			objectMode: true
		});
		this.parser = /*sync ? new SaxParserExt() :*/ new SaxPushParserExt();
		this.initParser();
	}
	
	_transform(chunk: string, encoding, callback) {
		this.parser.push(chunk);
		callback();
	}

	private initParser() {
		this.parser.on('startElementNSExt', (elem, attrs, prefix, uri, ns, text) => {

			this.push(new SaxEventObject(
				'start',
				nameNs(uri, elem),
				text,
				attrs,
				prefix, elem, uri, ns));
			
		}).on('endElementNS', (elem, prefix, uri) => {
			
			this.push(new SaxEventObject(
				'end',
				nameNs(uri, elem),
				null, null, prefix, elem, uri));
		});
	}
}