import { DefaultMap } from './data_structures'
import { CoolSet } from './data_structures/cool_set'

////////////////////////////////////////////////////////////////////////////////
export class Grouping<ElementType, GroupType> {
  protected groupMap = new DefaultMap<GroupType, CoolSet<ElementType>>(CoolSet)
  protected elemToGroup = new Map<ElementType, GroupType>()

  engroup(element: ElementType, to: GroupType) {
    this.groupMap.get(to).add(element)
    this.elemToGroup.set(element, to)
  }

  areSameGroup(element1: ElementType, element2: ElementType) {
    return this.has(element1)
      && this.has(element2)
      && this.getGroup(element1) === this.getGroup(element2)
  }

  has(element: ElementType) {
    return this.elemToGroup.has(element)
  }

  getGroup(element: ElementType) {
    return this.elemToGroup.get(element)
  }

  groups() {
    return this.groupMap.values()
  }
}

////////////////////////////////////////////////////////////////////////////////
export class SimpleGrouping<ElementType> extends Grouping<ElementType, ElementType> {
  engroupAsDeafault(element: ElementType, as: ElementType) {
    this.selfgroup(as)
    this.engroup(element, as)
  }

  private selfgroup(element: ElementType) {
    this.engroup(element, element)
  }
}
