export const r = String.raw;

////////////////////////////////////////////////////////////////////////////////
export function arrayed(value: any | any[]) {
  return Array.isArray(value) ? value : [value];
}

////////////////////////////////////////////////////////////////////////////////
export function last<T>(array: Array<T>) {
  return array[array.length - 1];
}

////////////////////////////////////////////////////////////////////////////////
export function wrappedOrNull<T>(construct: { new (val): T; }, val) {
  return val ? new construct(val) : null;
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

////////////////////////////////////////////////////////////////////////////////
export function complement<T>(a: Set<T>, b: Set<T>) {
  return new Set([...a].filter(x => !b.has(x)));
}

////////////////////////////////////////////////////////////////////////////////
export function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(() => resolve(), ms));
}

////////////////////////////////////////////////////////////////////////////////
export function isUndefined(value) {
  return typeof value === 'undefined';
}

////////////////////////////////////////////////////////////////////////////////
export function isOddball(value) {
  return isUndefined(value) || value === null;
}

////////////////////////////////////////////////////////////////////////////////
export function isString(value) {
  return typeof value === 'string';
}

////////////////////////////////////////////////////////////////////////////////
export function isNumber(value) {
  return typeof value === 'number';
}

////////////////////////////////////////////////////////////////////////////////
export function isObject(value) {
  return typeof value === 'object';
}

////////////////////////////////////////////////////////////////////////////////
export function compare(a, b) {
  if (isOddball(a) && !isOddball(b)) {
    return -1;
  }

  if (!isOddball(a) && isOddball(b)) {
    return 1;
  }

  if (isNumber(a) && isNumber(b)) {
    return numericCompare(a, b);
  }

  return lexCompare(a, b);
}

////////////////////////////////////////////////////////////////////////////////
export function numericCompare(a: number, b: number) {
  return a - b;
}

////////////////////////////////////////////////////////////////////////////////
export function lexCompare(a, b) {
  return String(a).localeCompare(String(b));
}

////////////////////////////////////////////////////////////////////////////////
/** pythonish */
export function* zip<T>(...iterables: Iterable<T>[]) {
  let iterators = iterables.map(x => x[Symbol.iterator]());

  for (let state = iterators.map(x => x.next());
    state.every(x => !x.done);
    state = iterators.map(x => x.next())) {

    yield state.map(x => x.value);
  }
}

////////////////////////////////////////////////////////////////////////////////
/** pythonish */
export function* zipLongest<T>(...iterables: Iterable<T>[]) {
  let iterators = iterables.map(x => x[Symbol.iterator]());

  for (let state = iterators.map(x => x.next());
    state.some(x => !x.done);
    state = iterators.map(x => x.next())) {

    yield state.map(x => x.done ? undefined : x.value);
  }
}

////////////////////////////////////////////////////////////////////////////////
/** class decorator, see http://www.typescriptlang.org/docs/handbook/mixins.html */
export function mixin(...baseCtors: any[]) {  // todo: why not Object[]?
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
export function strlen(str: string) {
  return countGenerated(str[Symbol.iterator]());
}
