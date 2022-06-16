export type Dict<ValueType> = { [key: string]: ValueType }
export type StringDict = Dict<string>
export type ClassConstructor<T> = { new(): T }
export type Predicate<T> = (x: T) => any
export type Comparator<T> = (a: T, b: T) => number
export type Unpacked<T> =
  T extends Array<infer U> ? U :
  T extends Iterable<infer U> ? U :
  T extends (...args: Array<any>) => infer U ? U :
  T extends Promise<infer U> ? U :
  T
export type Timeout = ReturnType<typeof setTimeout>