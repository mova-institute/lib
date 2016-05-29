////////////////////////////////////////////////////////////////////////////////
export function wrappedOrNull<T>(construct: { new (val): T; }, val) {
  return val ? new construct(val) : null;
}

////////////////////////////////////////////////////////////////////////////////
/** class decorator, see http://www.typescriptlang.org/docs/handbook/mixins.html */
export function mixin(...baseCtors: any[]) {
  return derivedCtor => {
    baseCtors.forEach(baseCtor => {
      Object.getOwnPropertyNames(baseCtor.prototype).forEach(name => {
        Object.defineProperty(derivedCtor.prototype, name,
          Object.getOwnPropertyDescriptor(baseCtor.prototype, name));
      });
    });
  };
}

////////////////////////////////////////////////////////////////////////////////
export function countGenerated<T>(generator: Iterator<T>) {
  let i = 0;
  while (!generator.next().done) {
    ++i;
  }

  return i;
}

////////////////////////////////////////////////////////////////////////////////
export function ithGenerated<T>(generator: Iterator<T>, index: number) {
  let cur = generator.next();
  while (index-- && !cur.done) {
    cur = generator.next();
  }

  return cur.value;
}
