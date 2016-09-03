import { SaxEventObject } from './sax_event_object'
import { Transform } from 'stream'



export class SaxEventStacker extends Transform {
  stack = new Array<SaxEventObject>()

  constructor() {
    super({
      objectMode: true,
    })
  }

  _transform(event: SaxEventObject, encoding, callback) {
    if (event.type === 'start') {
      this.stack.push(event)
      this.push(this.stack.slice(0))
    }
    else if (event.type === 'end') {
      this.stack[this.stack.length - 1] = event
      this.push(this.stack.slice(0))
      this.stack.pop()
    }
    callback()
  }
}
