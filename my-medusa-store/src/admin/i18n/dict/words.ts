/**
 * The shape of a dictionary section without its exact words.
 *
 * `typeof` a Spanish section is too precise to hold a translation: a function
 * written as `count === 1 ? "pedido" : "pedidos"` is typed as returning one
 * of those two Spanish strings, and no English one fits. This widens every
 * string (and what functions return) to `string`, and keeps the rest: the
 * keys, the arguments and the nesting, which is what a translation must
 * match.
 */
export type Words<T> = T extends string
  ? string
  : T extends (...args: infer Args) => infer Result
  ? (...args: Args) => Words<Result>
  : T extends readonly (infer Item)[]
  ? Words<Item>[]
  : T extends object
  ? { [Key in keyof T]: Words<T[Key]> }
  : T
