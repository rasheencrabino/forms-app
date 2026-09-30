/**
 * Returns a new array with the item at `from` moved to index `to`.
 * The input is never mutated. If either index is out of range (or they are
 * equal), an unchanged copy is returned.
 */
export function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
    return result;
  }
  const [moved] = result.splice(from, 1);
  result.splice(to, 0, moved);
  return result;
}
