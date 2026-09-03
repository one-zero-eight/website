export function getLogoURLById(clubId: string, logoFileId?: string | null) {
  const base = `${import.meta.env.VITE_CLUBS_API_URL}/clubs/by-id/${clubId}/logo`;
  // Bust the browser cache whenever the underlying logo file changes, since
  // the URL is otherwise stable even after a new logo is uploaded/approved.
  return logoFileId ? `${base}?v=${encodeURIComponent(logoFileId)}` : base;
}

export function getDescriptionImageUrl(imageId: string) {
  return `${import.meta.env.VITE_CLUBS_API_URL}/clubs/description-images/${imageId}`;
}

/**
 * Direct MinIO URL for a club logo file, bypassing the club-scoped
 * `/clubs/by-id/{id}/logo` endpoint (which only ever serves the *current*,
 * already-approved logo). Needed to preview a club leader's *pending* logo
 * on the admin review page, since there is no backend endpoint for that.
 *
 * This assumes the backend's storage layout (bucket "clubs", object name
 * `logos/<file_id>-512`) observed on this local setup — that layout is
 * driven by backend config (`minio.club_logos_prefix`), not a fixed
 * contract, so it may not hold in other environments. Requires
 * `VITE_CLUBS_MINIO_URL` to be set (e.g. in an untracked .env.local); when
 * unset this returns null and callers should fall back to a text-only note.
 */
export function getPendingLogoPreviewUrl(logoFileId: string): string | null {
  const base = import.meta.env.VITE_CLUBS_MINIO_URL;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/logos/${encodeURIComponent(logoFileId)}-512`;
}
