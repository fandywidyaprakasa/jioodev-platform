import { describe, expect, it } from "vitest";
import {
  UNDO_HISTORY_LIMIT,
  popEntry,
  prependEntry,
  pushEntry,
  shiftEntry,
} from "@/modules/workspace/components/use-undo-redo";

type Entry = { themeId: string };

function entry(themeId: string): Entry {
  return { themeId };
}

describe("undo/redo history stack", () => {
  describe("pushEntry", () => {
    it("appends an entry to the stack", () => {
      const past = pushEntry([entry("a")], entry("b"), UNDO_HISTORY_LIMIT);
      expect(past.map((item) => item.themeId)).toEqual(["a", "b"]);
    });

    it("trims to the limit keeping the newest entries", () => {
      const limit = 5;
      let past: Entry[] = [];
      for (let i = 0; i < 8; i += 1) {
        past = pushEntry(past, entry(`e${i}`), limit);
      }
      expect(past.map((item) => item.themeId)).toEqual(["e3", "e4", "e5", "e6", "e7"]);
      expect(past.length).toBe(limit);
    });

    it("keeps exactly the limit when filled to the edge", () => {
      const limit = 3;
      const past = pushEntry([entry("a"), entry("b"), entry("c")], entry("d"), limit);
      expect(past.map((item) => item.themeId)).toEqual(["b", "c", "d"]);
    });
  });

  describe("popEntry (undo source)", () => {
    it("pops the newest entry", () => {
      const result = popEntry([entry("a"), entry("b")]);
      expect(result.popped?.themeId).toBe("b");
      expect(result.rest.map((item) => item.themeId)).toEqual(["a"]);
    });

    it("returns null when the stack is empty", () => {
      const result = popEntry<Entry>([]);
      expect(result.popped).toBeNull();
      expect(result.rest).toEqual([]);
    });
  });

  describe("prependEntry (redo destination)", () => {
    it("prepends the current entry to the future stack", () => {
      const future = prependEntry([entry("b")], entry("a"), UNDO_HISTORY_LIMIT);
      expect(future.map((item) => item.themeId)).toEqual(["a", "b"]);
    });

    it("trims future entries beyond the limit", () => {
      const limit = 3;
      const future = prependEntry(
        [entry("b"), entry("c"), entry("d")],
        entry("a"),
        limit,
      );
      expect(future.map((item) => item.themeId)).toEqual(["a", "b", "c"]);
    });
  });

  describe("shiftEntry (redo source)", () => {
    it("shifts the oldest future entry", () => {
      const result = shiftEntry([entry("a"), entry("b")]);
      expect(result.shifted?.themeId).toBe("a");
      expect(result.rest.map((item) => item.themeId)).toEqual(["b"]);
    });

    it("returns null when the future stack is empty", () => {
      const result = shiftEntry<Entry>([]);
      expect(result.shifted).toBeNull();
      expect(result.rest).toEqual([]);
    });
  });

  describe("full lifecycle", () => {
    it("supports edit, undo, redo, undo cycles without losing snapshots", () => {
      const limit = UNDO_HISTORY_LIMIT;
      let past: Entry[] = [];
      let future: Entry[] = [];
      let current = entry("v1");
      let redoable: Entry = entry("");

      const commit = (next: Entry) => {
        past = pushEntry(past, current, limit);
        future = [];
        current = next;
      };

      commit(entry("v2"));
      expect(past.map((item) => item.themeId)).toEqual(["v1"]);
      expect(future).toEqual([]);

      const undo = () => {
        const shifted = popEntry(past);
        if (!shifted.popped) return;
        past = shifted.rest;
        future = prependEntry(future, current, limit);
        current = shifted.popped;
      };
      const redo = () => {
        const shifted = shiftEntry(future);
        if (!shifted.shifted) return;
        future = shifted.rest;
        past = pushEntry(past, current, limit);
        current = shifted.shifted;
        redoable = current;
      };

      commit(entry("v3"));
      undo();
      expect(current.themeId).toBe("v2");

      redo();
      expect(current.themeId).toBe("v3");
      expect(redoable.themeId).toBe("v3");

      undo();
      undo();
      expect(current.themeId).toBe("v1");
      expect(past).toEqual([]);
      expect(future.map((item) => item.themeId)).toEqual(["v2", "v3"]);
    });

    it("clears the future stack after a fresh edit (branch cut)", () => {
      const limit = UNDO_HISTORY_LIMIT;
      let past: Entry[] = [];
      let future: Entry[] = [];
      let current = entry("v1");

      const commit = (next: Entry) => {
        past = pushEntry(past, current, limit);
        future = [];
        current = next;
      };

      commit(entry("v2"));
      const shifted = popEntry(past);
      past = shifted.rest;
      future = prependEntry(future, current, limit);
      current = shifted.popped ?? current;
      expect(current.themeId).toBe("v1");

      commit(entry("v2-again"));
      expect(future).toEqual([]);
      expect(past.map((item) => item.themeId)).toEqual(["v1"]);
    });

    it("does not exceed the limit across many edits", () => {
      const limit = 10;
      let past: Entry[] = [];
      let current = entry("v0");
      for (let i = 1; i <= 25; i += 1) {
        past = pushEntry(past, current, limit);
        current = entry(`v${i}`);
      }
      expect(past.length).toBe(limit);
      expect(past[0]?.themeId).toBe("v15");
      expect(past[past.length - 1]?.themeId).toBe("v24");
    });
  });

  describe("UNDO_HISTORY_LIMIT", () => {
    it("is 50", () => {
      expect(UNDO_HISTORY_LIMIT).toBe(50);
    });
  });
});
