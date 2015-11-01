import {Dictionary} from './dictionary';
import {Guide} from './guide';
import {encodeUtf8, b64decodeFromArray} from '../codec';
import {Readable} from 'stream';
import {StringDecoder} from 'string_decoder';		//todo
import {openSync} from 'fs'

let decoder = new StringDecoder('utf8');

export class Dawg {
	constructor(protected dic: Dictionary) {}

	has(key: string): boolean {
		return this.dic.has(encodeUtf8(key));
	}
}


function *completer(dic: Dictionary, guide: Guide, index: number) {
	let completion: Array<number> = [];
	let indexStack = [index];
	while (indexStack.length) {
		
		// find terminal
		while (!dic.hasValue(index)) {
			let label = guide.child(index);
			index = dic.followByte(label, index);
			if (index === null) {
				return;
			}
			completion.push(label);
			indexStack.push(index);
		}

		yield completion;

		let childLabel = guide.child(index);
		if (childLabel) {
			if ((index = dic.followByte(childLabel, index)) === null) {
				return;
			}
			completion.push(childLabel);
			indexStack.push(index);
		}
		else {
			while (true) {
				// move up to previous
				indexStack.pop();
				if (!indexStack.length) {
					return;
				}
				completion.pop();			

				let siblingLabel = guide.sibling(index);
				index = indexStack[indexStack.length - 1];
				if (siblingLabel) {	// todo: that's the '\0' place??
					if ((index = dic.followByte(siblingLabel, index)) === null) {
						return;
					}
					completion.push(siblingLabel);
					indexStack.push(index);
					break;
				}
			}
		}
	}
}


export class CompletionDawg extends Dawg {
	constructor(protected dic: Dictionary, protected guide: Guide) {
		super(dic);
	}

	readSync(path: string) {
		let f = openSync(path, 'r');
	}

	*completionBytes(key: Array<number>) {
		let index = this.dic.followBytes(key);
		if (index === null)
			return;

		for (let completion of completer(this.dic, this.guide, index)) {
			yield completion;
		}
	}
	
	*completionStrings(key: string) {
		for (let completionBytes of this.completionBytes(encodeUtf8(key))) {
			yield decoder.write(new Buffer(completionBytes));
		}
	}
}


/*export class BytesDawg extends CompletionDawg {
	
	constructor(private payloadSeparator: number = 0) {
		super();
	}
	
	*payloadBytes(key: Array<number>) {
		key.push(this.payloadSeparator);
		for (let completed of super.completionBytes(key)) {
			yield b64decodeFromArray(completed);
		}
	}
}


export class ObjectDawg extends BytesDawg {
	
	constructor(payloadSeparator: number = 1,
		private deserializer: (bytes: Uint8Array) => any = bytes => bytes) {
		
		super(payloadSeparator);
	}
	
	lookup(key: string) {
		let toret = [];
		
		for (let payload of super.payloadBytes(encodeUtf8(key))) {
			toret.push(this.deserializer(payload));
		}
		
		return toret;
	}
}*/