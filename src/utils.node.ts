import {createReadStream, createWriteStream, readFileSync, writeFileSync, readSync, Stats, statSync} from 'fs';


let argv = require('minimist')(process.argv.slice(2));
let jsdom = require('jsdom').jsdom;
let xmldom = require('xmldom');
let pd = require('pretty-data2').pd


////////////////////////////////////////////////////////////////////////////////
export function filename2jsdomRootSync(filename: string) {
	var xmlstr = readFileSync(filename, 'utf-8');
	let doc = jsdom(xmlstr, {
		parsingMode: 'xml'
	});
	
	return doc.documentElement;
}

////////////////////////////////////////////////////////////////////////////////
export function jsdom2fileSync(doc, filename: string) {
	let stringi = new xmldom.XMLSerializer().serializeToString(doc.ownerDocument);
	writeFileSync(filename, pd.xml(stringi));
}

////////////////////////////////////////////////////////////////////////////////
export function readNBytesSync(n: number, fd: number) {
	let buf = new Buffer(n);
	readSync(fd, buf, 0, n, null);
	
	return buf;
}

////////////////////////////////////////////////////////////////////////////////
export function tryStatSync(path: string): Stats {
	try {
		return statSync(path);
	}
	catch (e) {
		return null;
	}
}