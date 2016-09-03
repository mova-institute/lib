export class WordDawgPayload {
  paradigmId: number
  indexInPradigm: number

  static create(bytes: Uint8Array) {  // todo: reference constructor directly
    return new WordDawgPayload(bytes)
  }

  constructor(bytes: Uint8Array) {
    let view = new DataView(bytes.buffer)
    this.paradigmId = view.getUint16(0, false)
    this.indexInPradigm = view.getUint16(2, false)
  }
}
