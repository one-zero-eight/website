export type DescriptionDoc = {
  type?: string;
  content?: DescriptionDoc[];
  text?: string;
  [key: string]: unknown;
};

function nodeHasText(node: unknown): boolean {
  if (!node || typeof node !== "object") {
    return false;
  }

  const value = node as DescriptionDoc;
  if (value.type === "text" && (value.text ?? "").trim()) {
    return true;
  }

  if (!Array.isArray(value.content)) {
    return false;
  }

  return value.content.some(nodeHasText);
}

export function isEmptyDescriptionDoc(doc: unknown): boolean {
  return !nodeHasText(doc);
}

export function parseDescriptionContent(
  description?: string | null,
): DescriptionDoc | null {
  if (!description?.trim()) {
    return null;
  }

  return JSON.parse(description) as DescriptionDoc;
}

export function stringifyDescriptionContent(doc: unknown): string | null {
  if (!doc || isEmptyDescriptionDoc(doc)) {
    return null;
  }

  return JSON.stringify(doc);
}
