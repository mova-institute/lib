import {buffer2arrayBuffer, readNBytes} from '../stream_utils.node'; 
import {Readable} from 'stream';

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



export class Dictionary {
	private buf: ArrayBuffer;
	private units: Uint32Array;
	private rootI = 0;

	async read(istream: Readable) {
		let size = (await readNBytes(4, istream)).readUInt32LE(0);
		this.buf = buffer2arrayBuffer(await readNBytes(size, istream));
		this.units = new Uint32Array(this.buf);
	}

	contains(bytes): boolean {
		return false;
	}

	private followByte(label: number, index: number): boolean {
		//let nextIndex = index ^ units[index]
		return false;
	}
}