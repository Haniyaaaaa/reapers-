// A store selector must return the same reference across calls when nothing changed — a
// selector like `(s) => s.someMap[id] ?? []` creates a fresh array literal on every call,
// which breaks useSyncExternalStore's referential-equality check and causes an infinite
// render loop ("Maximum update depth exceeded" / "getSnapshot should be cached"). Use this
// shared constant as the fallback instead of a new `[]` literal.
export const EMPTY_ARRAY: readonly never[] = [];
