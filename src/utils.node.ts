import {LibxmlDocument, LibxmlElement} from './xml/api/libxmljs_adapters'
import {createReadStream, createWriteStream, readFileSync, writeFileSync, readSync, Stats, statSync} from 'fs';
import {parseXmlString} from 'libxmljs'
import {readTillEnd} from './stream_utils.node'
import {createInterface} from 'readline'

////////////////////////////////////////////////////////////////////////////////
export async function stream2lxmlRoot(stream) {
	return string2lxmlRoot(await readTillEnd(stream));
}

////////////////////////////////////////////////////////////////////////////////
export function string2lxmlRoot(xmlstr: string) {
	let lxmlXml = parseXmlString(xmlstr);
	return new LibxmlDocument(lxmlXml).documentElement;
}

////////////////////////////////////////////////////////////////////////////////
export function filename2lxmlRootSync(filename: string) {
	let xmlstr = readFileSync(filename, 'utf8');
	let lxmlXml = parseXmlString(xmlstr);

	return new LibxmlDocument(lxmlXml).documentElement;
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

// ////////////////////////////////////////////////////////////////////////////////
// export function* lines(filename: string) {
// 	createInterface({ input: createReadStream(filename) })
// 		.on('line', line => yield line);
// }

////////////////////////////////////////////////////////////////////////////////
export function* linesSync(filename: string) {  // todo: do not buffer file
	for (let line of readFileSync(filename, 'utf8').split('\n')) {
		yield line;
	}
}