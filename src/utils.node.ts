import {LibxmlDocument, LibxmlElement} from './xml/api/libxmljs_adapters';
import {createReadStream, createWriteStream, readFileSync, writeFileSync, readSync, Stats, statSync} from 'fs';
import {parseXmlString} from 'libxmljs';
import {readTillEnd} from './stream_utils.node';
import {createInterface} from 'readline';

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


////////////////////////////////////////////////////////////////////////////////
export function* nonemptyLinesSync(filename: string) {
	for (let line of linesSync(filename)) {
    if (line) {
		  yield line;
    }
	}
}

////////////////////////////////////////////////////////////////////////////////
function buffer2arrayBuffer(val: Buffer, start = 0, length = val.length) {	// todo: copy 64?
	let ret = new ArrayBuffer(length);
	let view = new Uint8Array(ret);
	for (let i = 0; i < length; ++i) {
		view[i] = val[start + i];
	}
	
	return ret;
}

////////////////////////////////////////////////////////////////////////////////
export function buffer2typedArray(buffer: Buffer, ArrayType, startByte = 0, byteLength = buffer.length) {
	return new ArrayType(buffer2arrayBuffer(buffer, startByte, byteLength));
}