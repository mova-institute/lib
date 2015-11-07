import {Transform} from 'stream'
import {G, W, W_, PC} from './common_tags'
import {NS} from '../xml/utils'
import {SaxEventObject} from '../xml/sax_event_object'
import {ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetween} from '../nlp/utils'


export class GlueInjector extends Transform {
	private static gObjectStart = new SaxEventObject('start', G);
	private static gObjectEnd = new SaxEventObject('end', G);

	private prevEvent;
	private insideAmbig = false;

	constructor() {
		super({
			objectMode: true
		});
	}

	_transform(event: SaxEventObject, encoding, callback) {
		if (event.el === W || event.el === W_ || event.el === PC) {
			if (event.type === 'start') {
				if (!this.insideAmbig && this.prevEvent && !haveSpaceBetween(
					this.prevEvent.el, this.prevEvent.text, event.el, event.text)) {
				
					this.pushGlue();
				}
				if (event.el === W_) {
					this.insideAmbig = true;
				}
				
				this.prevEvent = event;
			}
			else {
				if (event.el === W_) {
					this.insideAmbig = false;
				}
			}
		}
		else {
			this.prevEvent = null;
		}
		
		this.push(event);
		callback();
	}

	private pushGlue() {
		this.push(GlueInjector.gObjectStart);
		this.push(GlueInjector.gObjectEnd);
	}
}