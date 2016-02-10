import {Dictionary} from './dictionary';
import {Guide} from './guide';
import {encodeUtf8, decodeUtf8, b64decodeFromArray} from '../codec';
import {Readable} from 'stream';




////////////////////////////////////////////////////////////////////////////////
export class Dawg {
	constructor(protected dic: Dictionary) { }

	has(key: string): boolean {
		return this.dic.has(encodeUtf8(key));
	}
}


////////////////////////////////////////////////////////////////////////////////
export class CompletionDawg extends Dawg {
	constructor(dic: Dictionary, protected guide: Guide) {
		super(dic);
	}

	*completionBytes(key: Array<number>) {
		let index = this.dic.followBytes(key);
		if (index === null)
			return;

		for (let completion of completer(this.dic, this.guide, index)) {
			yield completion;
		}
	}
}


////////////////////////////////////////////////////////////////////////////////
export class BytesDawg extends CompletionDawg {
	
	constructor(dic: Dictionary, guide: Guide, private _payloadSeparator: number = 1) {
		super(dic, guide);
	}
	
	has(key: string): boolean {
		return !super.completionBytes([...encodeUtf8(key), this._payloadSeparator]).next().done;
	}
	
	*payloadBytes(key: Array<number>) {
		key.push(this._payloadSeparator);
		for (let completed of super.completionBytes(key)) {
			yield b64decodeFromArray(completed.slice(0, -1));  // todo: why \n is there? 
		}
	}
}


////////////////////////////////////////////////////////////////////////////////
export class ObjectDawg<T> extends BytesDawg {
	
	constructor(dic: Dictionary, guide: Guide, payloadSeparator: number,
		private _deserializer: (bytes: ArrayBuffer) => T) {
		
		super(dic, guide, payloadSeparator);
	}
	
	get(key: string) {
		let ret = new Array<T>();
		
		for (let payload of super.payloadBytes(encodeUtf8(key))) {
			ret.push(this._deserializer(payload));
		}
		
		return ret;
	}
}



////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////
function* completer(dic: Dictionary, guide: Guide, index: number) {
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
