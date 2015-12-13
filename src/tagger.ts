import {CompletionDawg} from './dawg/dawg';
import {createReadStream} from 'fs';


export interface Tag {
	lemma: string;
	tags: string;
}

const SEP = ' ';

export class Tagger {

	constructor(private dawg: CompletionDawg) {}
	
	tag(token: string) {
		let toret = new Set<string>();
		if (/^\d+$/.test(token)) {
			return [[token, 'Md']];
		}
		
		for (let completion of this.dawg.completionStrings(token + SEP)) {
			toret.add(completion);
		}
		let lowercase = token.toLowerCase();
		if (lowercase !== token) {
			for (let completion of this.dawg.completionStrings(lowercase + SEP)) {
				toret.add(completion);
			}
		}
		
		return Array.from(toret, x => x.split(SEP));
	}
	
	knows(token: string) {
		if (this.dawg.hasKeyWithPrefix(token + SEP)) {
			return true;
		}
		let lowercase = token.toLowerCase();
		if (lowercase !== token) {
			return this.dawg.hasKeyWithPrefix(lowercase + SEP);
		}
		
		return false;
	}
}