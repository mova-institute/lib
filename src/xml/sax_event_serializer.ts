import {Transform} from 'stream'
import {SaxEventObject} from './sax_event_object'


export class SaxEventSerializer extends Transform {

  constructor() {
    super({
      objectMode: true
    });
  }
  
  _transform(event: SaxEventObject, encoding, callback) {
    this.push(event.serialize());
    callback();
  }
}
