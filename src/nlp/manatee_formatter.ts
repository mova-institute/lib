import {NS, nameNs, tagStr, libxmlSaxAttrs} from '../xml/utils'
import {W, W_, PC, SS, SE, G, P, S, SP, TEI} from './common_elements'
import {Transform} from 'stream'
import {SaxEventObject} from '../xml/sax_event_object'

const AMBIG_SEP = ';';
const ELEMS_TO_REPUSH = new Set([P, S, SP]);

export class ManateeFormatter extends Transform {
	private curTags: Array<string> = [];
	private curLemmata: Array<string> = [];
	private curMorpheme: string;
	private curDisambIndex: number = null;

	constructor() {
		super({
			objectMode: true
		});
	}

	_transform(event: SaxEventObject, encoding, callback) {
		if (event.type === 'start') {

			if (event.el === TEI) {
				this.pushln('<text>');
			}
			else if (ELEMS_TO_REPUSH.has(event.el)) {
				this.pushln(tagStr(true, event.prefix, event.elem, event.attrs()));
			}
			else if (event.el === W_) {
				let ana = event.attrs().get('ana');
				this.curDisambIndex = ana ? parseInt(ana) : null;
			}
			else if (event.el === W) {
				if (this.curDisambIndex === null || !(this.curDisambIndex--)) {
					this.curMorpheme = event.text;
					this.curTags.push(event.attrs().get('ana'));
					this.curLemmata.push(event.attrs().get('lemma'));
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

			if (event.el === TEI) {
				this.pushln('</text>');
			}
			else if (ELEMS_TO_REPUSH.has(event.el)) {
				this.pushln(tagStr(false, event.prefix, event.elem));
			}
			else if (event.el === W_) {
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