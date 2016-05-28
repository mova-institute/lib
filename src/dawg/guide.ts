export class Guide {
  constructor(private units: Uint8Array) {
  }

  child(index: number) {
    return this.units[index * 2];
  }

  sibling(index: number) {
    return this.units[index * 2 + 1];
  }
}
