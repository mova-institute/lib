import {DawgInterprocess} from './dawg_interprocess';

export interface Tag {
	lemma: string;
	tags: string;
}

export class Tagger {
	private dawg = new DawgInterprocess();
	
	close(): void {
		this.dawg.close();
	}
	
	async tag(token: string) {
		return await this.dawg.keys(token);
	}
	
	async knows(token: string) {
		let tokens = await this.tag(token);
		
		return tokens && tokens.length > 0;
	}
}