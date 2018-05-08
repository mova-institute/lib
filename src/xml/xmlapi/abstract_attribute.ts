export abstract class AbstractAttribute {
  abstract namespaceUri(): string
  abstract namespacePrefix(): string
  abstract nameLocal(): string
  abstract namePrefixed(): string
  nameNs() {
    return '{' + (this.namespaceUri() || '') + '}' + this.nameLocal()
  }
  abstract value(): string

  abstract equals(other: AbstractAttribute): boolean
}
