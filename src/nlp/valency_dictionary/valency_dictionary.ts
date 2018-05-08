import { mu, Mu } from '../../mu'
import { DefaultMap, CoolSet } from '../../data_structures'
import { normalizeApostrophes } from '../utils'



////////////////////////////////////////////////////////////////////////////////
export const enum Valency {
  intransitive,  // 0, 0_acc, '' // немає obj/ccomp
  accusative,  // {}, acc, acc_* не opt
  optional, // acc_opt.*, acc|
}

////////////////////////////////////////////////////////////////////////////////
export class ValencyDict {
  valencies = new DefaultMap<string, Set<Valency>>(Set)
  noun2verb = new DefaultMap<string, CoolSet<string>>(CoolSet)


  has(lemma: string) {
    lemma = normalizeApostrophes(lemma, `'`)
    return this.valencies.has(lemma)
  }

  lookup(lemma: string) {
    lemma = normalizeApostrophes(lemma, `'`)

    let ret = this.valencies.getRaw(lemma)
    if (ret === undefined) {
      return mu<Valency>()
    }

    return mu(ret)
  }

  isTransitiveOnlyGerund(lemma: string) {
    return this.noun2verb.has(lemma)
      && this.lookupVerb4Noun(lemma).every(x => this.isAccusativeOnly(x))
  }

  isIntransitiveOnlyGerund(lemma: string) {
    return this.noun2verb.has(lemma)
      && this.lookupVerb4Noun(lemma).every(x => this.isIntransitiveOnly(x))
  }

  isAccusativeOnly(lemma: string) {
    return this.valencies.has(lemma) && this.lookup(lemma).every(x => x === Valency.accusative)
  }

  isIntransitiveOnly(lemma: string) {
    return this.valencies.has(lemma) && this.lookup(lemma).every(x => x === Valency.intransitive)
  }

  private lookupVerb4Noun(lemma: string) {
    let ret = this.noun2verb.getRaw(lemma)
    if (ret === undefined) {
      return mu<string>()
    }
    return mu(ret)
  }
}

