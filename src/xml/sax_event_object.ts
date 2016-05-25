import { namePrefixed, libxmlSaxAttrs, escape } from '../xml/utils';

export class SaxEventObject {
  private _attrsMapCache: Map<string, string> = null;

  constructor(public type: string,
              public el: string,
              public text?: string,
              public attrsNs?: Array<[string, string, string, string]>,
              public prefix?: string,
              public elem?: string,
              public uri?: string,
              public ns?: Array<any>) {
  }

  toString() {
    return `${this.type}-${this.el}-${this.text || ''}`;
  }

  attrs() {
    if (!this._attrsMapCache) {
      this._attrsMapCache = libxmlSaxAttrs(this.attrsNs);
    }

    return this._attrsMapCache;
  }

  serialize() {
    if (this.type === 'end') {
      return `</${namePrefixed(this.prefix, this.elem) }>`;
    }

    if (this.type === 'start') {
      let ret = `<${namePrefixed(this.prefix, this.elem) }`;
      for (let [key, prefix, value] of this.attrsNs) {
        ret += ` ${namePrefixed(prefix, key)}="${escape(value)}"`;
      }
      for (let [prefix, uri] of this.ns) {
        ret += ' xmlns';
        if (prefix) {
          ret += ':' + prefix;
        }
        ret += `="${uri}"`;
      }
      ret += '>' + escape(this.text);

      return ret;
    }
  }
}
