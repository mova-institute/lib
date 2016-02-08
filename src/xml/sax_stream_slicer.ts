import {Transform} from 'stream'
import {SaxEventObject} from '../xml/sax_event_object'

enum State { PRISTINE, STARTED, STOPPED };

export class SaxStreamSlicer extends Transform {
	private _state = State.PRISTINE;

	constructor(protected predicate: (SaxEventObject) => boolean) {
		super({
			objectMode: true
		});
	}

	_transform(eventStack: Array<SaxEventObject>, encoding, callback) {
		let event = eventStack[eventStack.length - 1];
		let el = event.el;
		if (event.type === 'start') {
			if (this._state === State.PRISTINE && this.predicate(event) === true) {
				this._state = State.STARTED;
				this._openParents(eventStack);
			}
			else if (this._state === State.STARTED) {
				if (this.predicate(event) === false) {
					this._close(eventStack);
					this._state = State.STOPPED;
					//this.end(); console.log('end called');
				}
				else {
					this.push(event);
				}
			}
		}
		else if (event.type === 'end' && this._state === State.STARTED) {
			this.push(event);
		}
		
		callback();
	}
	
	private _openParents(eventStack: Array<SaxEventObject>) {
		for (let e of eventStack) {
			this.push(e);
		}
	}
	
	private _close(eventStack: Array<SaxEventObject>) {
		for (let i = eventStack.length - 2, e = eventStack[i]; i > -1; --i, e = eventStack[i]) {
			this.push(new SaxEventObject('end', e.el, e.text, e.attrsNs, e.prefix, e.elem, e.uri, e.ns));
		}
	}
}