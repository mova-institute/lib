export class StreamPauser {
  private pausers = new Set<any>()

  constructor(private stream: NodeJS.ReadableStream) {
  }

  pause(pauser: any) {
    this.pausers.add(pauser)
    this.poke()
  }

  resume(pauser: any) {
    if (this.pausers.delete(pauser)) {
      this.poke()
    }
  }

  isPaused() {
    return !!this.pausers.size
  }

  isPausedBy(pauser: any) {
    return this.pausers.has(pauser)
  }

  private poke() {
    if (this.pausers.size && !this.stream.isPaused()) {
      this.stream.pause()
    } else if (!this.pausers.size && this.stream.isPaused()) {
      this.stream.resume()
    }
  }
}
