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
	
	export function label(unit: number): number {
		return unit & (IS_LEAF_BIT | 0xFF);
	}
}



export class Dictionary {
	private buf: ArrayBuffer;
	private units: Uint32Array;
	private static rootIndex = 0;	// todo: add const,
																// see https://github.com/Microsoft/TypeScript/issues/4045

	async read(istream: Readable) {
		let size = (await readNBytes(4, istream)).readUInt32LE(0);
		this.buf = buffer2arrayBuffer(await readNBytes(size, istream));
		this.units = new Uint32Array(this.buf);
	}

	has(bytes: Iterable<number>): boolean {
		let index = this.followBytes(bytes, Dictionary.rootIndex);
		return index !== null && Unit.hasLeaf(this.units[index]);
	}

	private followByte(label: number, index: number) {
		let nextIndex = index ^ Unit.offset(this.units[index]) ^ label;
		if (Unit.label(this.units[nextIndex]) !== label) {
			return null;
		}

		return nextIndex;
	}
	
	private followBytes(bytes: Iterable<number>, index) {
		for (let byte of bytes) {
			index = this.followByte(byte, index);
			if (index === null) {
				return null;
			}
		}
		
		return index;
	}
}