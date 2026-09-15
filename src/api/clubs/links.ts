export function getLogoURLById(clubId: string) {
  return `${import.meta.env.VITE_CLUBS_API_URL}/clubs/by-id/${clubId}/logo`;
}

export function getDescriptionImageUrl(imageId: string) {
  return `${import.meta.env.VITE_CLUBS_API_URL}/clubs/description-images/${imageId}`;
}

export function extractClubSlugFromUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  try {
    const pathname = new URL(url, window.location.origin).pathname;
    const match = pathname.match(/\/clubs\/([^/]+)/);
    return match?.[1] ?? null;
  } catch {
    const match = url.match(/\/clubs\/([^/?#]+)/);
    return match?.[1] ?? null;
  }
}
