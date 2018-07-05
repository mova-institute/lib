import { mu, Mu } from '../../mu'
import { DefaultMap } from '../../data_structures'
import { normalizeApostrophes, removeCombiningAccent } from '../utils'
import { DictValency } from '../morph_features'
import { CoolSet } from '../../data_structures/cool_set'



////////////////////////////////////////////////////////////////////////////////
export const enum ValencyCase {
  intransitive,  // 0, 0_acc, '' // немає obj/ccomp
  accusative,  // {}, acc, acc_* не opt
  // optional, // acc_opt.*, acc|
}

////////////////////////////////////////////////////////////////////////////////
export const enum Valency {
  intransitive,
  accusative,
  ambiguous,
}

////////////////////////////////////////////////////////////////////////////////
export class ValencyDict {
  valencies = new DefaultMap<string, CoolSet<ValencyCase>>(CoolSet)
  gerund2verb = new DefaultMap<string, CoolSet<string>>(CoolSet)
  nounOverlayValencies = new DefaultMap<string, CoolSet<ValencyCase>>(CoolSet)

  private lookupVerbCases(lemma: string) {
    lemma = normalizeLemma(lemma)

    let ret = this.valencies.getRaw(lemma)
    if (ret === undefined) {
      return mu<ValencyCase>()
    }

    return mu(ret)
  }

  private lookupGerundCases(lemma: string) {
    lemma = normalizeLemma(lemma)

    if (this.nounOverlayValencies.has(lemma)) {
      return mu(this.nounOverlayValencies.getRaw(lemma)).unique()
    }
    let res = this.lookupGerund2verb(lemma)
      .map(x => this.lookupVerbCases(x))
      .flattenShallowNaive()
      .unique()
    // if (this.nounOverlayValencies.has(lemma)) {
    //   res = Mu.chain(res, this.nounOverlayValencies.getRaw(lemma))
    // }

    return res.unique() as Mu<ValencyCase>
  }

  private lookupGerund2verb(lemma: string) {
    lemma = normalizeLemma(lemma)

    let ret = this.gerund2verb.getRaw(lemma)
    if (ret === undefined) {
      return mu<string>()
    }
    return mu(ret)
  }

  hasVerb(lemma: string) {
    lemma = normalizeLemma(lemma)
    return this.valencies.has(lemma)
  }

  hasGerund(lemma: string) {
    lemma = normalizeLemma(lemma)
    return this.nounOverlayValencies.has(lemma) || this.gerund2verb.has(lemma)
  }

  isTransitiveOnlyGerund(lemma: string) {
    return this.hasGerund(lemma)
      && this.lookupGerundCases(lemma).every(x => x === ValencyCase.accusative)
  }

  isIntransitiveOnlyGerund(lemma: string) {
    return this.hasGerund(lemma)
      && this.lookupGerundCases(lemma).every(x => x === ValencyCase.intransitive)
  }

  isAmbigiousGerund(lemma: string) {
    return this.hasGerund(lemma)
      && this.lookupGerundCases(lemma).count() > 1
  }

  isAccusativeOnlyVerb(lemma: string) {
    return this.hasVerb(lemma)
      && this.lookupVerbCases(lemma).every(x => x === ValencyCase.accusative)
  }

  isIntransitiveOnlyVerb(lemma: string) {
    return this.hasVerb(lemma)
      && this.lookupVerbCases(lemma).every(x => x === ValencyCase.intransitive)
  }

  isAmbigiousVerb(lemma: string) {
    return this.hasVerb(lemma)
      && this.lookupVerbCases(lemma).count() > 1
  }

  lookupVerb(lemma: string) {
    if (!this.hasVerb(lemma)) {
      return
    }
    let cases = this.lookupVerbCases(lemma).toArray()
    if (cases.length > 1) {
      return DictValency.ambiguous
    }
    return cases[0] === ValencyCase.accusative
      ? DictValency.accusative
      : DictValency.intransitive
  }

  lookupGerund(lemma: string) {
    if (!this.hasGerund(lemma)) {
      return
    }
    let cases = this.lookupGerundCases(lemma).toArray()
    if (cases.length > 1) {
      return DictValency.ambiguous
    }
    return cases[0] === ValencyCase.accusative
      ? DictValency.accusative
      : DictValency.intransitive
  }

  buildStats() {
    let numVerbTotal = this.valencies.size
    let numGerundsTotal = this.gerund2verb.size

    let numUnambigTransitiveVerbs = mu(this.valencies.keys()).count(x => this.isAccusativeOnlyVerb(x))
    let numUnambigIntransitiveVerbs = mu(this.valencies.keys()).count(x => this.isIntransitiveOnlyVerb(x))
    let numUnambigTransitiveGerunds = mu(this.gerund2verb.keys()).count(x => this.isTransitiveOnlyGerund(x))
    let numUnambigIntransitiveGerunds = mu(this.gerund2verb.keys()).count(x => this.isIntransitiveOnlyGerund(x))

    let numAmbigVerbs = numVerbTotal - numUnambigTransitiveVerbs - numUnambigIntransitiveVerbs
    let numAmbigGerunds = numGerundsTotal - numUnambigTransitiveGerunds - numUnambigIntransitiveGerunds
    let percentAmbigVerbs = numAmbigVerbs / numVerbTotal
    let percentAmbigGerunds = numAmbigGerunds / numGerundsTotal

    return {
      numVerbTotal,
      numGerundsTotal,

      numUnambigTransitiveVerbs,
      numUnambigIntransitiveVerbs,
      numAmbigVerbs,
      percentAmbigVerbs,
      numUnambigTransitiveGerunds,
      numUnambigIntransitiveGerunds,
      numAmbigGerunds,
      numAmbigGerunds2: mu(this.gerund2verb.keys()).count(x => this.isAmbigiousGerund(x)),
      percentAmbigGerunds,
    }
  }
}

//------------------------------------------------------------------------------
function normalizeLemma(val: string) {
  let ret = normalizeApostrophes(val, `'`)
  ret = removeCombiningAccent(ret)

  return ret
}
