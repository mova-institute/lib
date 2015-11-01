import {Tagger} from './tagger'
import {Dictionary} from './dawg/dictionary'
import {Guide} from './dawg/guide'
import {Dawg, CompletionDawg} from './dawg/dawg'

declare function fetch(...a);

export async function createTagger(dawgUri: string) {
	let response = await fetch(dawgUri);
	let data = await response.arrayBuffer();
	let dataview = new DataView(data);
	
	let dicLen = dataview.getUint32(0, true);
	let dic = new Dictionary(new Uint32Array(data, 4, dicLen));
	
	let guideLen = dataview.getUint32(4 + dicLen*4, true);
	let guide = new Guide(new Uint8Array(data, 4 + dicLen*4 + 4, guideLen));
	
	return new Tagger(new CompletionDawg(dic, guide));
}