import {Transform} from 'stream';
import {G, W, W_, PC} from './common_elements';
import {NS} from '../xml/utils';
import {SaxEventObject} from '../xml/sax_event_object';
import {ELEMS_BREAKING_SENTENCE_NS, haveSpaceBetween} from '../nlp/utils';


export class GlueInjector extends Transform {
	private static gObjectStart = new SaxEventObject('start', G);
	private static gObjectEnd = new SaxEventObject('end', G);

	private _prevEvent;

	constructor() {
		super({
			objectMode: true
		});
	}

	_transform(event: SaxEventObject, encoding, callback) {
		if (event.el === W_ || event.el === PC) {
			if (event.type === 'start') {
				if (this._prevEvent && !haveSpaceBetween(
					this._prevEvent.el, this._prevEvent.text, event.el, event.text)) {
				
					this._pushGlue();
				}
				this._prevEvent = event;
			}
		}
		else if (event.el !== W) {
			this._prevEvent = null;
		}
		
		this.push(event);
		callback();
	}

	private _pushGlue() {
		this.push(GlueInjector.gObjectStart);
		this.push(GlueInjector.gObjectEnd);
	}
}