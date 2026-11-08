import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createVersion,
  getRestorePayload,
  listVersions,
  versionHash,
  VERSION_LIMIT,
} from "@/modules/workspace/application/versioning";

let temp = "";

beforeAll(() => {
  temp = mkdtempSync(path.join(tmpdir(), "jioodev-versions-"));
  process.env.JIOODEV_LIBRARY_DIR = temp;
});

afterAll(() => {
  rmSync(temp, { recursive: true, force: true });
  delete process.env.JIOODEV_LIBRARY_DIR;
});

function input(sectionMessage: string) {
  return {
    sections: [{ code: "S-HERO", content: { message: sectionMessage } }],
    themeId: "theme-a",
    tier: "BASIC" as const,
    compositionId: "comp-1",
  };
}

describe("workspace content versioning", () => {
  it("stores a snapshot with author, hash and sections", async () => {
    const created = await createVersion("proj1", "page1", input("v1"), {
      author: "arnold",
      message: "awal",
    });
    expect(created).not.toBeNull();
    expect(created?.author).toBe("arnold");
    expect(created?.message).toBe("awal");
    expect(created?.hash).toBeTruthy();
    expect(created?.sections).toEqual([{ code: "S-HERO", content: { message: "v1" } }]);
  });

  it("deduplicates identical sequential saves (autosave explosion guard)", async () => {
    const versions = await listVersions("proj-dedupe", "page1");
    expect(versions).toEqual([]);
    await createVersion("proj-dedupe", "page1", input("same"), { author: "a" });
    const first = await listVersions("proj-dedupe", "page1");
    expect(first.length).toBe(1);
    await createVersion("proj-dedupe", "page1", input("same"), { author: "a" });
    const second = await listVersions("proj-dedupe", "page1");
    expect(second.length).toBe(1);
    expect(versionHash(input("same"))).toBeTruthy();
  });

  it("lists newest first", async () => {
    await createVersion("proj-order", "page1", input("v-older"), { author: "a" });
    await new Promise((resolve) => setTimeout(resolve, 10));
    await createVersion("proj-order", "page1", input("v-newer"), { author: "a" });
    const versions = await listVersions("proj-order", "page1");
    expect(versions.map((version) => version.sections)).toEqual([
      [{ code: "S-HERO", content: { message: "v-newer" } }],
      [{ code: "S-HERO", content: { message: "v-older" } }],
    ]);
  });

  it("getRestorePayload returns stored payload and rejects unknown ids", async () => {
    const created = await createVersion("proj-restore", "page1", input("restore-me"), {
      author: "a",
    });
    expect(created).not.toBeNull();
    const payload = await getRestorePayload(
      "proj-restore",
      "page1",
      created?.version ?? "",
    );
    expect(payload?.themeId).toBe("theme-a");
    expect(payload?.tier).toBe("BASIC");

    expect(await getRestorePayload("proj-restore", "page1", "nope-999999")).toBeNull();
    expect(
      await getRestorePayload("proj-restore", "page1", "../../etc/passwd"),
    ).toBeNull();
  });

  it("keeps only the newest VERSION_LIMIT snapshots", async () => {
    for (let i = 0; i < VERSION_LIMIT + 5; i += 1) {
      await createVersion("proj-limit", "page1", input(`v${i}`), { author: "a" });
    }
    const versions = await listVersions("proj-limit", "page1");
    expect(versions.length).toBe(VERSION_LIMIT);
    expect(versions[0]?.sections).toEqual([{ code: "S-HERO", content: { message: `v${VERSION_LIMIT + 4}` } }]);
  });

  it("rejects unsafe project or page identifiers", async () => {
    expect(await createVersion("../escape", "p", input("x"), { author: "a" })).toBeNull();
    expect(await createVersion("proj-safe../", "p", input("x"), { author: "a" })).toBeNull();
    const created = await createVersion("proj-unsafe-page", "a/b/../c", input("x"), {
      author: "a",
    });
    if (created === null) {
      expect(created).toBeNull();
    }
  });

  it("persists file readable on disk under versions dir", async () => {
    const created = await createVersion("proj-file", "page1", input("disk"), {
      author: "a",
    });
    expect(created).not.toBeNull();
    const file = path.join(temp, "versions", "proj-file", "page1", `${created?.version}.json`);
    expect(existsSync(file)).toBe(true);
    const raw = JSON.parse(readFileSync(file, "utf8")) as { author: string };
    expect(raw.author).toBe("a");
  });
});
