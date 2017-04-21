////////////////////////////////////////////////////////////////////////////////
export class UnsignedIntCycle {
  private value = 0

  next() {
    if (this.value === Number.MAX_SAFE_INTEGER) {
      return this.value = 0
    }
    return this.value++
  }
}
