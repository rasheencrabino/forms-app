import { describe, expect, it } from "vitest";
import { moveItem } from "./move-item";

describe("moveItem", () => {
  const items = ["a", "b", "c", "d"];

  it("moves an item forward", () => {
    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item backward", () => {
    expect(moveItem(items, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("moves an item to the first and last index", () => {
    expect(moveItem(items, 2, 0)).toEqual(["c", "a", "b", "d"]);
    expect(moveItem(items, 1, 3)).toEqual(["a", "c", "d", "b"]);
  });

  it("swaps adjacent items", () => {
    expect(moveItem(items, 1, 2)).toEqual(["a", "c", "b", "d"]);
    expect(moveItem(items, 2, 1)).toEqual(["a", "c", "b", "d"]);
  });

  it("returns an unchanged copy when from equals to", () => {
    const result = moveItem(items, 1, 1);
    expect(result).toEqual(items);
    expect(result).not.toBe(items);
  });

  it("returns an unchanged copy when an index is out of range", () => {
    expect(moveItem(items, -1, 2)).toEqual(items);
    expect(moveItem(items, 4, 0)).toEqual(items);
    expect(moveItem(items, 0, -1)).toEqual(items);
    expect(moveItem(items, 0, 4)).toEqual(items);
  });

  it("handles an empty array", () => {
    expect(moveItem([], 0, 0)).toEqual([]);
  });

  it("does not mutate the input", () => {
    const input = ["a", "b", "c"];
    moveItem(input, 0, 2);
    expect(input).toEqual(["a", "b", "c"]);
  });
});
