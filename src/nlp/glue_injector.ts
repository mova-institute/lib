import { Transform } from 'stream'
import { G, W, W_, PC } from './common_elements'
import { SaxEventObject } from '../xml/sax_event_object'
import { haveSpaceBetween } from '../nlp/utils'


export class GlueInjector extends Transform {
  private static gObjectStart = new SaxEventObject('start', G)
  private static gObjectEnd = new SaxEventObject('end', G)

  private prevEvent

  constructor() {
    super({
      objectMode: true,
    })
  }

  _transform(event: SaxEventObject, encoding, callback) {
    if (event.el === W_ || event.el === PC) {
      if (event.type === 'start') {
        if (this.prevEvent && !haveSpaceBetween(
            this.prevEvent.el, this.prevEvent.text, event.el, event.text)) {

          this.pushGlue()
        }
        this.prevEvent = event
      }
    }
    else if (event.el !== W) {
      this.prevEvent = null
    }

    this.push(event)
    callback()
  }

  private pushGlue() {
    this.push(GlueInjector.gObjectStart)
    this.push(GlueInjector.gObjectEnd)
  }
}
