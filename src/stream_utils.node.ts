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