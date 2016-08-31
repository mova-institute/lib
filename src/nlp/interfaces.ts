////////////////////////////////////////////////////////////////////////////////
export abstract class IStringMorphInterp {
  flags: string;
  lemma: string;

  static hash(value: IStringMorphInterp) {
    return value.flags + ' ' + value.lemma;
  }
}

////////////////////////////////////////////////////////////////////////////////
export class StringMorphInterp implements IStringMorphInterp {
  constructor(public flags: string, public lemma: string) {
  }

  hash() {
    return this.flags + ' ' + this.lemma;
  }
}
