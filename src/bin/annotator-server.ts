import {SaxEventObjectifier} from '../xml/sax_event_objectifier'
import {SaxEventStacker} from '../xml/sax_event_stacker'
import {SaxStreamSlicer} from '../xml/sax_stream_slicer'
import {SaxEventSerializer} from '../xml/sax_event_serializer'

import {W_} from '../nlp/common_elements'

import {createServer} from 'http'
import {parse} from 'querystring'
import {Readable, Writable} from 'stream'
import {readFileSync, createReadStream, statSync} from 'fs'

createServer(serve).listen(8888);


function serve(req, res) {
	if (req.url.startsWith('/favi')) {
		return;
	}

	let query = parse(req.url.substr(5));
	console.log('query: ', query);
	query.begin = Number.parseInt(query.begin) || 0;
	query.end = Number.parseInt(query.end) || 0;
	res.setHeader('Content-Type', 'application/xml; charset=UTF-8');
	// res.setHeader('Access-Control-Allow-Origin', 'https://experimental.mova.institute');
	res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');
	res.setHeader('Access-Control-Allow-Credentials', 'true');
	res.writeHead(200);
	let counter = -1;
	let filename = '../data/' + query.file;
	try {
		statSync(filename);
		createReadStream(filename, 'utf8')
		.pipe(new SaxEventObjectifier())
		.pipe(new SaxEventStacker())
		.pipe(new SaxStreamSlicer(e => {
			if (e.el === W_) {
				++counter;
				return counter >= query.begin && counter <= query.end;
			}
		}))
		.pipe(new SaxEventSerializer())
		.pipe(res);
	}
	catch (e) {
		console.log('Exception!!!!!!!!:\n\n', e);
		res.end();
	}
}