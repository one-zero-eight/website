import { mkdtemp, open, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createBuildLabel } from "../../scripts/build-labels.ts";

let directory: string;
let historyFile: string;
const createdAt = "2026-11-10T10:00:00.000Z";

beforeEach(async () => {
  directory = await mkdtemp(join(tmpdir(), "innohassle-build-labels-"));
  historyFile = join(directory, "build-labels.txt");
});

afterEach(async () => {
  await rm(directory, { recursive: true, force: true });
});

describe("persistent HTML build labels", () => {
  it("allocates 1, 2, 3 and records each creation time", async () => {
    const secondCreatedAt = "2026-11-10T10:01:00.000Z";
    const thirdCreatedAt = "2026-11-10T10:02:00.000Z";
    expect(await createBuildLabel(historyFile, createdAt)).toBe(1);
    expect(await createBuildLabel(historyFile, secondCreatedAt)).toBe(2);
    expect(await createBuildLabel(historyFile, thirdCreatedAt)).toBe(3);
    expect(await readFile(historyFile, "utf8")).toBe(
      `${createdAt}\t1\n${secondCreatedAt}\t2\n${thirdCreatedAt}\t3\n`,
    );
  });

  it("continues from disk rather than an in-memory counter", async () => {
    await writeFile(historyFile, `${createdAt}\t1\n${createdAt}\t2\n`);
    expect(await createBuildLabel(historyFile, createdAt)).toBe(3);
  });

  it("rejects malformed history without resetting or overwriting it", async () => {
    const history = `${createdAt}\t1\n${createdAt}\t7\n`;
    await writeFile(historyFile, history);
    await expect(createBuildLabel(historyFile, createdAt)).rejects.toThrow(
      "Invalid build label history",
    );
    expect(await readFile(historyFile, "utf8")).toBe(history);
    await expect(readFile(`${historyFile}.lock`)).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("rejects a concurrent reservation instead of allocating duplicate numbers", async () => {
    const lock = await open(`${historyFile}.lock`, "wx");
    try {
      await expect(
        createBuildLabel(historyFile, createdAt),
      ).rejects.toMatchObject({ code: "EEXIST" });
      await expect(readFile(historyFile)).rejects.toMatchObject({
        code: "ENOENT",
      });
    } finally {
      await lock.close();
    }
  });
});
