import {Transform} from 'stream'
import {ELEMS_BREAKING_SENTENCE_NS} from '../nlp/utils'
import {W, W_, S, SS, SE} from './common_tags'
import {SaxEventObject} from '../xml/sax_event_object'


export class SentenceStartInjector extends Transform {
	private static objectStart = new SaxEventObject('start', SS);
	private static objectEnd = new SaxEventObject('end', SS);
	
	private openSentenceOnNextWord = false;
	private insideAmbig = false;

	constructor() {
		super({
			objectMode: true
		});
	}

	_transform(event: SaxEventObject, encoding, callback) {
		let el = event.el;
		if (event.type === 'start') {
			if (el === SE || ELEMS_BREAKING_SENTENCE_NS.has(el)) {
				this.openSentenceOnNextWord = true;
			}
			else if (el === S || el === SS) {
				this.openSentenceOnNextWord = false;
			}
			else if (el === W && !this.insideAmbig && this.openSentenceOnNextWord) {
				this.pushSentenceStart();
			}
			else if (el === W_) {
				this.insideAmbig = true;
				if (this.openSentenceOnNextWord) {
					this.pushSentenceStart();
				}
			}
		}
		else if (event.type === 'end') {
			if (el === S) {
				this.openSentenceOnNextWord = true;
			}
			else if (el === W_) {
				this.insideAmbig = false;
			}
		}

		this.push(event);
		callback();
	}
	
	private pushSentenceStart() {
		this.push(SentenceStartInjector.objectStart);
		this.push(SentenceStartInjector.objectEnd);
		this.openSentenceOnNextWord = false;
	}
}