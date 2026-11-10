import { appendFile, open, readFile, unlink } from "node:fs/promises";

/** Reserve one local build number and keep its creation time outside build output. */
export async function createBuildLabel(historyFile: string, builtAt: string) {
  const lockFile = `${historyFile}.lock`;
  const lock = await open(lockFile, "wx");
  try {
    let history = "";
    try {
      history = await readFile(historyFile, "utf8");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    }

    const entries = history.split("\n");
    if (entries.at(-1) === "") entries.pop();
    for (const [index, entry] of entries.entries()) {
      const [createdAt, label, extra] = entry.split("\t");
      if (
        !createdAt ||
        Number.isNaN(Date.parse(createdAt)) ||
        label !== String(index + 1) ||
        extra !== undefined
      ) {
        throw new Error(
          `Invalid build label history at ${historyFile}:${index + 1}`,
        );
      }
    }
    const label = entries.length + 1;
    const separator = history !== "" && !history.endsWith("\n") ? "\n" : "";
    await appendFile(historyFile, `${separator}${builtAt}\t${label}\n`);
    return label;
  } finally {
    await lock.close();
    await unlink(lockFile);
  }
}
