import { SchemaResolvedLocation } from "@/api/workshops/types";

export function locationDisplayName(
  location: SchemaResolvedLocation | null | undefined,
): string {
  return location?.display_name?.trim() || "TBA";
}

export function locationMapsSearch(
  location: SchemaResolvedLocation | null | undefined,
): { q?: string; scene?: string; area?: string } | undefined {
  const url = location?.url?.trim();
  if (!url) {
    return undefined;
  }

  try {
    const parsed = new URL(url, window.location.origin);
    const q = parsed.searchParams.get("q") ?? undefined;
    const scene = parsed.searchParams.get("scene") ?? undefined;
    const area = parsed.searchParams.get("area") ?? undefined;
    if (!q && !scene && !area) {
      return undefined;
    }
    return { q, scene, area };
  } catch {
    return undefined;
  }
}
