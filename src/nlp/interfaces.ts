////////////////////////////////////////////////////////////////////////////////
export abstract class IMorphInterp {
  flags: string;
  lemma: string;

  static hash(value: IMorphInterp) {
    return value.flags + ' ' + value.lemma;
  }
}

////////////////////////////////////////////////////////////////////////////////
export class StringMorphInterp implements IMorphInterp {
  constructor(public flags: string, public lemma: string) {
  }

  hash() {
    return this.flags + ' ' + this.lemma;
  }
}
