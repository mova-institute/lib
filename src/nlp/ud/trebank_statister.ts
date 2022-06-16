import { TokenNode, isNonprojective } from './uk_grammar'
import { CoolSet } from '../../data_structures/cool_set'
import { toUd, toConlluishString } from './tagset'

export class TrebankStatister {
  private numGaps = 0
  private numNonprojective = 0
  private tags = new CoolSet<string>()

  feedSentence(nodes: Array<TokenNode>) {
    this.numNonprojective += nodes
      .filter((x) => !x.node.isElided())
      .some((x) => isNonprojective(x))
      ? 1
      : 0

    this.tags.addAll(nodes.map((x) => toConlluishString(x.node.interp)))
  }

  accountGap() {
    ++this.numGaps
  }

  produceStats() {
    return {
      gaps: this.numGaps,
      numNonprojective: this.numNonprojective,
      numTags: this.tags.size,
    }
  }
}
