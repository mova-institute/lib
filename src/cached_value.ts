////////////////////////////////////////////////////////////////////////////////
export class CachedValue<T> {
  private value: T
  private valid = false

  constructor(private calculator: () => T) {
  }

  get() {
    if (this.valid) {
      return this.value
    }
    let ret = this.value = this.calculator()  // watch for exceptions
    this.valid = true

    return ret
  }

  invalidate() {
    this.valid = false
    return this
  }
}
