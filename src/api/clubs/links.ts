export function getLogoURLById(clubId: string) {
  return `${import.meta.env.VITE_CLUBS_API_URL}/clubs/by-id/${clubId}/logo`;
}
