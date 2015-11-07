import {Transform} from 'stream'


export class SaxEventSerializer extends Transform {

	constructor() {
		super({
			objectMode: true
		});
	}
	
	_transform(chunk, encoding, callback) {
		this.push(chunk.toString() + '\n');
		callback();
	}
}