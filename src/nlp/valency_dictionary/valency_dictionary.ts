import { mu, Mu } from '../../mu'
import { DefaultMap, CoolSet } from '../../data_structures'
import { normalizeApostrophes, removeAccent } from '../utils'



////////////////////////////////////////////////////////////////////////////////
export const enum Valency {
  intransitive,  // 0, 0_acc, '' // немає obj/ccomp
  accusative,  // {}, acc, acc_* не opt
  // optional, // acc_opt.*, acc|
}

////////////////////////////////////////////////////////////////////////////////
export class ValencyDict {
  valencies = new DefaultMap<string, CoolSet<Valency>>(CoolSet)
  gerund2verb = new DefaultMap<string, CoolSet<string>>(CoolSet)

  hasVerb(lemma: string) {
    lemma = normalizeLemma(lemma)
    return this.valencies.has(lemma)
  }

  hasGerund(lemma: string) {
    lemma = normalizeLemma(lemma)
    return this.gerund2verb.has(lemma)
  }

  lookupVerb(lemma: string) {
    lemma = normalizeLemma(lemma)

    let ret = this.valencies.getRaw(lemma)
    if (ret === undefined) {
      return mu<Valency>()
    }

    return mu(ret)
  }

  lookupGerund(lemma: string) {
    return this.lookupGerund2Verb(lemma)
      .map(x => this.lookupVerb(x))
      .flattenShallowNaive()
      .unique() as Mu<Valency>
  }

  lookupGerund2Verb(lemma: string) {
    lemma = normalizeLemma(lemma)

    let ret = this.gerund2verb.getRaw(lemma)
    if (ret === undefined) {
      return mu<string>()
    }
    return mu(ret)
  }

  isUnambTransitiveGerund(lemma: string) {
    return this.hasGerund(lemma)
      && this.lookupGerund(lemma).every(x => x === ValencyCase.accusative)
  }

  isAmbigiousGerund(lemma: string) {
    return this.hasGerund(lemma)
      && this.lookupGerund(lemma).count() > 1  //?
  }

  isUnambIntransGerund(lemma: string) {
    return this.hasGerund(lemma)
      && this.lookupGerund(lemma).every(x => x === ValencyCase.intransitive)
  }

  isUnambAccVerb(lemma: string) {
    return this.hasVerb(lemma)
      && this.lookupVerb(lemma).every(x => x === ValencyCase.accusative)
  }

  isUnambIntransVerb(lemma: string) {
    return this.hasVerb(lemma)
      && this.lookupVerb(lemma).every(x => x === ValencyCase.intransitive)
  }

  buildStats() {
    let numVerbTotal = this.valencies.size
    let numGerundsTotal = this.gerund2verb.size

    let numUnambigTransitiveVerbs = mu(this.valencies.keys()).count(x => this.isUnambAccVerb(x))
    let numUnambigIntransitiveVerbs = mu(this.valencies.keys()).count(x => this.isUnambIntransVerb(x))
    let numUnambigTransitiveGerunds = mu(this.gerund2verb.keys()).count(x => this.isUnambTransitiveGerund(x))
    let numUnambigIntransitiveGerunds = mu(this.gerund2verb.keys()).count(x => this.isUnambIntransGerund(x))

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

//^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
function normalizeLemma(val: string) {
  let ret = normalizeApostrophes(val, `'`)
  ret = removeAccent(ret)

  return ret
}
