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

export function readTillEnd(istream: Readable): Promise<string> {
	let toret = '';
	
	return new Promise((resolve, reject) => {
		
		istream.on('data', chunk => toret += chunk)
			.on('end', () => resolve(toret));
		
	});
}