export class CachedValue<T> {
  private value: T
  private valid = false

  constructor(private calculator: () => T) {
  }

  get() {
    if (this.valid) {
      return this.value
    }
    return this.value = this.calculator()
  }
}
