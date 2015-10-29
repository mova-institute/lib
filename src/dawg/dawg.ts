import {Dictionary} from './dictionary'
import {Guide} from './guide'
import {encodeUtf8} from '../lang'
import {Readable} from 'stream';


export class Dawg {
	protected dict = new Dictionary();
	
	async read(istream: Readable) {
		await this.dict.read(istream);
	}
	
	has(val: string): boolean {
		return this.dict.has(encodeUtf8(val));
	}
}

export class CompletionDawg extends Dawg {
	protected guide = new Guide();
	
	async read(istream: Readable) {
		await this.guide.read(istream);
	}
}