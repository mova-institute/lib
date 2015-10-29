import {Readable} from 'stream';

export function readNBytes(n: number, istream: Readable): Promise<Buffer> {
	return new Promise((resolve, reject) => {

		let waitUntilNBytes = () => {
			let buf = istream.read(n);
			if (buf) {
				resolve(buf);
			}
			else {
				istream.once('readable', waitUntilNBytes);
			}
		};

		waitUntilNBytes();
	});
}

export function buffer2arrayBuffer(val: Buffer) {
	let toret = new ArrayBuffer(val.length);
	let view = new Uint8Array(toret);
	for (let i = 0; i < val.length; ++i) {
		view[i] = val[i];
	}
	
	return toret;
}