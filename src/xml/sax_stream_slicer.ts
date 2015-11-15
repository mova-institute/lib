import {Transform} from 'stream'
import {SaxEventObject} from '../xml/sax_event_object'

enum State { PRISINE, STARTED, STOPPED };

export class SaxStreamSlicer extends Transform {
	private state = State.PRISINE;

	constructor(protected predicate: (SaxEventObject) => boolean) {
		super({
			objectMode: true
		});
	}

	_transform(eventStack: Array<SaxEventObject>, encoding, callback) {
		let event = eventStack[eventStack.length - 1];
		let el = event.el;
		if (event.type === 'start') {
			if (this.state === State.PRISINE && this.predicate(event) === true) {
				this.state = State.STARTED;
				this.openParents(eventStack);
			}
			else if (this.state === State.STARTED) {
				if (this.predicate(event) === false) {
					this.close(eventStack);
					this.state = State.STOPPED;
					this.end();
				}
				else {
					this.push(event);
				}
			}
		}
		else if (event.type === 'end' && this.state === State.STARTED) {
			this.push(event);
		}

		callback();
	}
	
	private openParents(eventStack: Array<SaxEventObject>) {
		for (let e of eventStack) {
			this.push(e);
		}
	}
	
	private close(eventStack: Array<SaxEventObject>) {
		for (let i = eventStack.length - 2, e = eventStack[i]; i > -1; --i, e = eventStack[i]) {
			this.push(new SaxEventObject('end', e.el, e.text, e.attrsNs, e.prefix, e.elem, e.uri, e.ns));
		}
	}
}