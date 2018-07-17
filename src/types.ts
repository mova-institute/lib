export type Dict<ValueType> = { [key: string]: ValueType }
export type StringDict = Dict<string>
export type ClassConstructor<T> = { new(): T }
export type Predicate<T> = (x: T) => any
