import { AbstractNode } from './abstract_node'
import { AbstractElement } from './abstract_element'

export type DocCreator = (xmlstr: string) => AbstractDocument

export abstract class AbstractDocument {
  abstract root(): AbstractElement // todo: ts 2.0

  abstract equals(other: AbstractDocument): boolean

  abstract createElement(name: string, nsUri?: string): AbstractElement
  abstract createTextNode(value: string): AbstractNode
  abstract serialize(pretty?: boolean): string
}
