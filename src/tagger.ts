import {CompletionDawg} from './dawg/dawg';
import {createReadStream} from 'fs';


export interface Tag {
	lemma: string;
	tags: string;
}

export class Tagger {

	constructor(private dawg: CompletionDawg) {}
	
	tag(token: string) {
		let toret = [];
		for (let completion of this.dawg.completionStrings(token)) {
			toret.push(completion.split(' '));
		}
		
		return toret;
	}
	
	knows(token: string) {
		return this.dawg.has(token + ' ');
	}
}