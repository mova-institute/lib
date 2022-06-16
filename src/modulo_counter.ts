export class ModuloCounter {
  constructor(private modulo: number, private state = 0) {}

  get() {
    return this.state
  }

  inc() {
    return (this.state = ++this.state % this.modulo)
  }

  incPost() {
    let ret = this.state
    this.inc()
    return ret
  }
}
