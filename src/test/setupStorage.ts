// Node 26 shadows the jsdom localStorage with one that does not work without --localstorage-file
if (typeof localStorage === "undefined") {
  const items = new Map<string, string>();
  const storage = {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, String(value)),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
    key: (index: number) => [...items.keys()][index] ?? null,
    get length() {
      return items.size;
    },
  } as Storage;
  for (const target of [window, globalThis]) {
    Object.defineProperty(target, "localStorage", {
      configurable: true,
      value: storage,
    });
  }
}
