/**
 * Extracts spreadsheet ID from various Google Sheets URL formats
 */
export function extractSpreadsheetId(url: string): string | null {
  const match = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

/**
 * Parses slug from join link URL
 */
export function parseSlugFromJoinLink(link: string): string | null {
  const match = link.match(/\/guard\/google\/files\/([^/]+)\/join/);
  return match ? match[1] : null;
}

/**
 * Builds join link for a file slug
 */
export function buildJoinLink(slug: string): string {
  return `${window.location.origin}/guard/google/files/${slug}/join`;
}

/**
 * Builds Google Sheets URL from file ID
 */
export function buildSheetsUrl(fileId: string): string {
  return `https://docs.google.com/spreadsheets/d/${fileId}/edit`;
}

/**
 * Builds Google Docs URL from file ID
 */
export function buildDocsUrl(fileId: string): string {
  return `https://docs.google.com/document/d/${fileId}/edit`;
}

/**
 * Formats ISO date string to readable format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/**
 * Saves Gmail to localStorage
 */
export function saveGmail(gmail: string): void {
  try {
    localStorage.setItem("guard_gmail", gmail);
  } catch (e) {
    console.error("Failed to save Gmail to localStorage:", e);
  }
}

/**
 * Loads Gmail from localStorage
 */
export function loadGmail(): string {
  try {
    return localStorage.getItem("guard_gmail") || "";
  } catch (e) {
    console.error("Failed to load Gmail from localStorage:", e);
    return "";
  }
}

/**
 * Filters list by search query against multiple fields
 */
export function filterByFields<T>(
  items: T[],
  query: string,
  fields: (keyof T)[],
): T[] {
  if (!query.trim()) return items;

  const lowerQuery = query.toLowerCase();
  return items.filter((item) =>
    fields.some((field) => {
      const value = item[field];
      return (
        typeof value === "string" && value.toLowerCase().includes(lowerQuery)
      );
    }),
  );
}
