import {Transform} from 'stream';
import {ELEMS_BREAKING_SENTENCE_NS} from '../nlp/utils';
import {W, W_, S, SS, SE} from './common_elements';
import {SaxEventObject} from '../xml/sax_event_object';


export class SentenceStartInjector extends Transform {
  private static objectStart = new SaxEventObject('start', SS);
  private static objectEnd = new SaxEventObject('end', SS);

  private _openSentenceOnNextWord = false;

  constructor() {
    super({
      objectMode: true,
    });
  }

  _transform(event: SaxEventObject, encoding, callback) {
    let el = event.el;
    if (event.type === 'start') {
      if (el === SE || ELEMS_BREAKING_SENTENCE_NS.has(el)) {
        this._openSentenceOnNextWord = true;
      }
      else if (el === S || el === SS) {
        this._openSentenceOnNextWord = false;
      }
      else if (el === W_ && this._openSentenceOnNextWord) {
        this._pushSentenceStart();
      }
    }
    else if (event.type === 'end') {
      if (el === S) {
        this._openSentenceOnNextWord = true;
      }
    }

    this.push(event);
    callback();
  }

  private _pushSentenceStart() {
    this.push(SentenceStartInjector.objectStart);
    this.push(SentenceStartInjector.objectEnd);
    this._openSentenceOnNextWord = false;
  }
}
