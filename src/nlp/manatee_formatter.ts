import { tagStr } from '../xml/utils';
import { W, W_, PC, SS, SE, G, P, S, SP, TEI } from './common_elements';
import { Transform } from 'stream';
import { SaxEventObject } from '../xml/sax_event_object';

const AMBIG_SEP = ';';
const ELEMS_TO_REPUSH = new Set([P, S, SP]);

export class ManateeFormatter extends Transform {
  private _curTags: Array<string> = [];
  private _curLemmata: Array<string> = [];
  private _curMorpheme: string;
  private _curDisambIndex: number = null;

  constructor() {
    super({
      objectMode: true,
    });
  }

  _transform(event: SaxEventObject, encoding, callback) {
    if (event.type === 'start') {

      if (event.el === TEI) {
        this._pushln('<text>');
      }
      else if (ELEMS_TO_REPUSH.has(event.el)) {
        this._pushln(tagStr(true, event.prefix, event.elem, event.attrs()));
      }
      else if (event.el === W_) {
        let ana = event.attrs().get('ana');
        this._curDisambIndex = ana ? Number.parseInt(ana, 10) : null;
      }
      else if (event.el === W) {
        if (this._curDisambIndex === null || !(this._curDisambIndex--)) {
          this._curMorpheme = event.text;
          this._curTags.push(event.attrs().get('ana'));
          this._curLemmata.push(event.attrs().get('lemma'));
        }
      }
      else if (event.el === PC) {
        this._pushln(event.text, 'PUN');
      }
      else if (event.el === SS) {
        this._pushln('<s>');
      }
      else if (event.el === SE) {
        this._pushln('</s>');
      }
      else if (event.el === G) {
        this._pushln('<g/>');
      }
    }

    else if (event.type === 'end') {

      if (event.el === TEI) {
        this._pushln('</text>');
      }
      else if (ELEMS_TO_REPUSH.has(event.el)) {
        this._pushln(tagStr(false, event.prefix, event.elem));
      }
      else if (event.el === W_) {
        this._pushln(this._curMorpheme, this._curTags.join(AMBIG_SEP), this._curLemmata.join(AMBIG_SEP));
        this._curTags = [];
        this._curLemmata = [];
      }
    }

    callback();
  }



  private _pushln(token: string, tag?: string, lemma?: string) {
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
