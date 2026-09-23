export function getLogoURLById(clubId: string, logoFileId?: string | null) {
  const base = `${import.meta.env.VITE_CLUBS_API_URL}/clubs/by-id/${clubId}/logo`;
  // Bust the browser cache whenever the underlying logo file changes, since
  // the URL is otherwise stable even after a new logo is uploaded/approved.
  return logoFileId ? `${base}?v=${encodeURIComponent(logoFileId)}` : base;
}

export function getDescriptionImageUrl(imageId: string) {
  return `${import.meta.env.VITE_CLUBS_API_URL}/clubs/description-images/${imageId}`;
}
