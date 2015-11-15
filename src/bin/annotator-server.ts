import {SaxEventObjectifier} from '../xml/sax_event_objectifier'
import {SaxEventStacker} from '../xml/sax_event_stacker'
import {SaxStreamSlicer} from '../xml/sax_stream_slicer'
import {SaxEventSerializer} from '../xml/sax_event_serializer'

import {W_} from '../nlp/common_elements'

import {createServer} from 'https'
//import {createServer as createServerHttps} from 'https'
import {parse} from 'querystring'
import {Readable, Writable} from 'stream'
import {readFileSync, createReadStream} from 'fs'



let options = {
  key: readFileSync('../data/mova.institute.key'),
  cert: readFileSync('/etc/ssl/certs/mova.institute.crt'),
	ca: readFileSync('/etc/ssl/certs/sub.class1.server.ca.pem')
};


let server = createServer(options, (req, res) => {
	if (req.url.startsWith('/favi')) {
		return;
	}

	let query = parse(req.url.substr(2));
	query.begin = Number.parseInt(query.begin) || 0;
	query.end = Number.parseInt(query.end) || 0;
	res.setHeader("Content-Type", 'application/xml; charset=UTF-8');
	res.setHeader('Access-Control-Allow-Origin', '*');
	res.writeHead(200);
	let counter = -1;
	createReadStream('../data/' + query.file, { encoding: 'utf8' })
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
	
}).listen(8888);