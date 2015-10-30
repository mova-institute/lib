import {buffer2arrayBuffer, readNBytes} from '../stream_utils.node'; 
import {Readable} from 'stream';


export class Guide {
	private buf: ArrayBuffer;
	private units: Uint8Array;
	private rootIndex = 0;
	
	async read(istream: Readable) {
		let size = (await readNBytes(4, istream)).readUInt32LE(0);
		this.buf = buffer2arrayBuffer(await readNBytes(size * 4 * 2, istream));
		this.units = new Uint8Array(this.buf);
	}
	
	child(index: number) {
		return this.units[index * 2];
	}
	
	sibling(index: number) {
		return this.units[index * 2 + 1];
	}
}