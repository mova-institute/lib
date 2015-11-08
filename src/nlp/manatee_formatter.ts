import {NS, nameNs, tagStr, libxmlSaxAttrs} from '../xml/utils'
import {W, W_, PC, S, SS, SE, G} from './common_elements'
import {Transform} from 'stream'
import {SaxEventObject} from '../xml/sax_event_object'

const AMBIG_SEP = ';';
const ELEMS_TO_REPUSH = new Set([nameNs(NS.tei, 'p'), nameNs(NS.tei, 's')]);

export class ManateeFormatter extends Transform {
	private insideAmbig = false;
	private curTags: Array<string> = [];
	private curLemmata: Array<string> = [];
	private curMorpheme: string;
	
	constructor() {
		super({
			objectMode: true
		});
	}

	_transform(event: SaxEventObject, encoding, callback) {
		if (event.type === 'start') {
			
			if (ELEMS_TO_REPUSH.has(event.el)) {
				this.pushln(tagStr(true, event.prefix, event.elem, event.attr));
			}
			else if (event.el === W_) {
				this.insideAmbig = true;
			}
			else if (event.el === W) {
				if (this.insideAmbig) {
					this.curMorpheme = event.text;
					this.curTags.push(event.attr['ana']);
					this.curLemmata.push(event.attr['lemma']);
				}
				else {
					this.pushln(event.text, event.attr['ana'], event.attr['lemma']);
				}
			}
			else if (event.el === PC) {
				this.pushln(event.text, 'PUN');
			}
			else if (event.el === SS) {
				this.pushln('<s>');
			}
			else if (event.el === SE) {
				this.pushln('</s>');
			}
			else if (event.el === G) {
				this.pushln('<g/>');
			}
		}
		
		else if (event.type === 'end') {
			
			if (ELEMS_TO_REPUSH.has(event.el)) {
				this.pushln(tagStr(false, event.prefix, event.elem));
			}
			else if (event.el === W_) {
				this.insideAmbig = false;
				this.pushln(this.curMorpheme, this.curTags.join(AMBIG_SEP), this.curLemmata.join(AMBIG_SEP));
				this.curTags = [];
				this.curLemmata = [];
			}
			
		}
		
		callback();
	}



	private pushln(token: string, tag?: string, lemma?: string) {
		this.push(token);
		if (tag) {
			this.push('\t' + tag);
			if (lemma) {
				this.push('\t' + lemma);
			}
		}
		this.push('\n');
	}
}