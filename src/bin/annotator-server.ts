import {SaxEventObjectifier} from '../xml/sax_event_objectifier'
import {SaxEventStacker} from '../xml/sax_event_stacker'
import {SaxStreamSlicer} from '../xml/sax_stream_slicer'
import {SaxEventSerializer} from '../xml/sax_event_serializer'

import {W_} from '../nlp/common_elements'

import {createServer} from 'http'
import {parse} from 'querystring'
import {Readable, Writable} from 'stream'
import {createReadStream} from 'fs'


let docs = new Map<string, HTMLElement>();

let server = createServer((req, res) => {
	if (req.url.startsWith('/favi')) {
		return;
	}

	let query = parse(req.url.substr(2));
	query.begin = Number.parseInt(query.begin) || 0;
	query.end = Number.parseInt(query.end) || 0;
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
	res.writeHead(200);
	let counter = 0;
	createReadStream('../data/' + query.file, { encoding: 'utf8' })
		.pipe(new SaxEventObjectifier())
		.pipe(new SaxEventStacker())
		.pipe(new SaxStreamSlicer(e => {
			if (e.el === W_) {
				return counter++ > query.begin && counter < query.end;
			}
		}))
		.pipe(new SaxEventSerializer())
		.pipe(res);
	
}).listen(8888);