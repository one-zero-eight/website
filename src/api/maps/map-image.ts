export function getMapImageUrl(svgName: string) {
  return `${import.meta.env.VITE_MAPS_API_URL}/static/${svgName}`;
}
