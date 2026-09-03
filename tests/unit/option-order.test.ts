import { describe, expect, it } from "vitest";
import { buildOptionOrder, shuffle, type Rng } from "@/domain/attempts/option-order";

/** A deterministic stand-in for crypto.randomInt so shuffle results are
 * reproducible in tests without weakening the production RNG. */
function seededRng(seed: number): Rng {
  let state = seed;
  return (maxExclusive: number) => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state % maxExclusive;
  };
}

describe("shuffle", () => {
  it("preserves every element — only order changes", () => {
    const items = ["a", "b", "c", "d"];
    const result = shuffle(items, seededRng(1));
    expect(result).toHaveLength(4);
    expect([...result].sort()).toEqual([...items].sort());
  });

  it("does not mutate the input array", () => {
    const items = ["a", "b", "c", "d"];
    const copy = [...items];
    shuffle(items, seededRng(1));
    expect(items).toEqual(copy);
  });

  it("different rng seeds can produce different orders", () => {
    const items = ["a", "b", "c", "d", "e", "f"];
    const orders = new Set(
      [1, 2, 3, 4, 5].map((seed) => shuffle(items, seededRng(seed)).join(","))
    );
    expect(orders.size).toBeGreaterThan(1);
  });

  it("is deterministic for a given rng", () => {
    const items = ["a", "b", "c", "d"];
    expect(shuffle(items, seededRng(42))).toEqual(shuffle(items, seededRng(42)));
  });
});

describe("buildOptionOrder", () => {
  it("produces one entry per question, each containing exactly that question's option ids", () => {
    const questions = [
      { id: "q1", optionIds: ["o1", "o2", "o3", "o4"] },
      { id: "q2", optionIds: ["o5", "o6", "o7", "o8"] },
    ];
    const order = buildOptionOrder(questions, seededRng(7));

    expect(Object.keys(order).sort()).toEqual(["q1", "q2"]);
    expect([...order.q1].sort()).toEqual(["o1", "o2", "o3", "o4"]);
    expect([...order.q2].sort()).toEqual(["o5", "o6", "o7", "o8"]);
  });

  it("defaults to the secure crypto RNG and still preserves all option ids", () => {
    const questions = [{ id: "q1", optionIds: ["o1", "o2", "o3", "o4"] }];
    const order = buildOptionOrder(questions); // no rng passed — exercises the real crypto path
    expect([...order.q1].sort()).toEqual(["o1", "o2", "o3", "o4"]);
  });
});
