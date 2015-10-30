import {Dictionary} from './dictionary'
import {Guide} from './guide'
import {encodeUtf8} from '../lang'
import {Readable} from 'stream';


import {StringDecoder} from 'string_decoder'
let decoder = new StringDecoder('utf8');

export class Dawg {
	protected dict = new Dictionary();

	async read(istream: Readable) {
		await this.dict.read(istream);
	}

	has(val: string): boolean {
		return this.dict.has(encodeUtf8(val));
	}
}

function* completer(dic: Dictionary, guide: Guide,
	index: number, prefix: Array<number>) {
	
	let indexStack = [index];
	while (indexStack.length) {
		
		// find terminal
		while (!dic.hasValue(index)) {
			let label = guide.child(index);
			index = dic.followByte(label, index);
			if (index === null) {
				return;
			}
			prefix.push(label);
			indexStack.push(index);
		}

		yield prefix;

		let childLabel = guide.child(index);
		if (childLabel) {
			if ((index = dic.followByte(childLabel, index)) === null) {
				return;
			}
			prefix.push(childLabel);
			indexStack.push(index);
		}
		else {
			while (true) {
				// move up to previous
				indexStack.pop();
				if (!indexStack.length) {
					return;
				}
				prefix.pop();			

				let siblingLabel = guide.sibling(index);
				index = indexStack[indexStack.length - 1];
				if (siblingLabel) {	// todo: that's the '\0' place??
					if ((index = dic.followByte(siblingLabel, index)) === null) {
						return;
					}
					prefix.push(siblingLabel);
					indexStack.push(index);
					break;
				}
			}
		}
	}
}

export class CompletionDawg extends Dawg {
	protected guide = new Guide();

	async read(istream: Readable) {
		await super.read(istream);
		await this.guide.read(istream);
	}

	complete(val: string) {
		let toret = [];

		let valBytes = encodeUtf8(val);
		let index = this.dict.followBytes(valBytes);
		if (index === null)
			return toret;

		for (let bytes of completer(this.dict, this.guide, index, valBytes)) {
			try {
				console.log(decoder.write(new Buffer(bytes)));
			}catch(e) {
				console.log(e);
			}
		}
		return toret;
	}
}