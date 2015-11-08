import {CompletionDawg} from './dawg/dawg';
import {createReadStream} from 'fs';


export interface Tag {
	lemma: string;
	tags: string;
}

export class Tagger {

	constructor(private dawg: CompletionDawg) {}
	
	tag(token: string) {
		let toret = new Set<string>();
		if (/^\d+$/.test(token)) {
			return [[token, 'NUM']];
		}
		
		for (let completion of this.dawg.completionStrings(token + ' ')) {
			toret.add(completion);
		}
		let lowercase = token.toLowerCase();
		if (lowercase !== token) {
			for (let completion of this.dawg.completionStrings(lowercase + ' ')) {
				toret.add(completion);
			}
		}
		
		return Array.from(toret, x => x.split(' '));
	}
	
	knows(token: string) {
		return this.dawg.has(token + ' ');
	}
}