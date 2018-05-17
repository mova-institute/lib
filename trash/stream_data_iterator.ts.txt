// todo: remove when v8 6.3
(Symbol.asyncIterator as any) = Symbol.asyncIterator || Symbol.for('Symbol.asyncIterator')

////////////////////////////////////////////////////////////////////////////////
export class StreamDataIterator<T> implements AsyncIterator<T> {
  private ended = false  //?

  constructor(private readable: NodeJS.ReadableStream) {
    readable.once('end', () => this.ended = true)
  }

  next() {
    return new Promise<IteratorResult<T>>((resolve, reject) => {
      if (this.ended) {
        resolve({ done: true, value: undefined })
      } else {
        // process.stderr.write(`ended`)
        this.readable.once('data', (data: T) => {
          this.readable.pause()
          resolve({ done: false, value: data })
        })
        this.readable.resume()
      }
    })
  }

  [Symbol.asyncIterator]() {
    return this
  }
}
