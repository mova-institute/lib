import {Readable} from 'stream'

let nBytesBase = 4;

module Unit {
	const OFFSET_MAX = 1 << 21;
	const IS_LEAF_BIT = 1 << 31;
	const HAS_LEAF_BIT = 1 << 8;
	const EXTENSION_BIT = 1 << 9;
	
	export function hasLeaf(unit: number): boolean {
			return (unit & HAS_LEAF_BIT) ? true : false;
	}
	
	export function offset(unit: number): number {
			return (unit >> 10) << ((unit & EXTENSION_BIT) >> 6);
	}
}



function readNBytes(n: number, istream: Readable): Promise<Buffer> {
	return new Promise((resolve, reject) => {

		let waitUntilNBytes = () => {
			let buf = istream.read(n);
			if (buf) {
				resolve(buf);
				return true;
			}
		};

		if (!waitUntilNBytes()) {
			istream.on('readable', waitUntilNBytes);
		}
	});
}




export class Dictionary {
	private units: Buffer;	// | Uint32Array;
	private rootI = 0;

	read(istream: Readable, callback) {
		return new Promise((resolve, reject) => {
			readNBytes(4, istream).then(size => {
				return readNBytes(4 * size.readUInt32LE(0), istream);
			})
				.then(units => {
					this.units = units;
					resolve();
				});
		});
	}

	contains(bytes): boolean {
		return false;
	}

	private followByte(label: number, index: number): boolean {
		//let nextIndex = index ^ units[index]
		return false;
	}
}