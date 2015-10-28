import {readFileSync} from 'fs';
//import {DawgInterprocess} from './dawg_interprocess';
let jsonstream = require('JSONStream');

export interface Tag {
	lemma: string;
	tags: string;
}

export class Tagger {
	//private dawg = new DawgInterprocess();
	private lemmata: Array<string>;
	private tags: Array<string>;
	private morphemes;
	
	constructor() {
		[this.lemmata, this.tags, this.morphemes] =
			JSON.parse(readFileSync('../data/rysin-dict.json', 'utf8'));
	}
	
	tag(token: string) {
		return (this.morphemes[token] || []).map(val => {
			return [this.lemmata[val[0]], this.tags[val[1]]];
		});
	}
	
	knows(token: string) {
		return token in this.morphemes;
	}
	
	/*close(): void {
		this.dawg.close();
	}
	
	async tag(token: string) {
		return await this.dawg.keys(token);
	}
	
	async knows(token: string) {
		let tokens = await this.tag(token);
		
		return tokens && tokens.length > 0;
	}*/
}