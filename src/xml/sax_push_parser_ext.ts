import {SaxParser, SaxPushParser} from 'libxmljs'
import {EventEmitter} from 'events'


export class SaxParserExtBase {
  protected parser: EventEmitter;
  protected listeners = new Array<Function>();
  protected textBuf = '';
  protected curElem = [];
  
  on(event: string, listener: Function) {
    if (event === 'startElementNSExt') {
      this.listeners.push(listener);
    }
    else {
      this.parser.on(event, listener);
    }

    return this;
  }
  
  push(chunk: string) {};
  
  protected initParser(parser: EventEmitter) {
    parser.on('startElementNS', (elem, attrs, prefix, uri, ns) => {
      this._emitStartIfBuffered();
      this.curElem = [elem, attrs, prefix, uri, ns];

    }).on('characters', chars => {
      this.textBuf += chars;
    }).on('endElementNS', (elem, prefix, uri) => {
      this._emitStartIfBuffered();
      this.curElem = [];
    });
  }
  
  private _emitStartIfBuffered() {
    if (this.curElem.length) {
      //for (let listener of this.listeners) {
        this.listeners[0](this.curElem[0], this.curElem[1], this.curElem[2],
                 this.curElem[3], this.curElem[4], this.textBuf);
      ///}
    }
    this.textBuf = '';
  }
}

export class SaxPushParserExt extends SaxParserExtBase {
  protected parser = new SaxPushParser();
  
  constructor() {
    super();
    this.initParser(this.parser);
  }

  push(chunk: string) {
    this.parser.push(chunk);
  }
}

export class SaxParserExt extends SaxParserExtBase {
  protected parser = new SaxParser();
  
  constructor() {
    super();
    this.initParser(this.parser);
  }

  push(val: string) {
    this.parser.parseString(val);
  }
}
