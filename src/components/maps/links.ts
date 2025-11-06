import { mapsTypes } from "@/api/maps";

export function getMapAreaUrl(
  scene: mapsTypes.SchemaScene,
  area: mapsTypes.SchemaArea,
) {
  const sceneUrl = `${window.location.origin}/maps?scene=${encodeURIComponent(scene.scene_id)}`;
  if (area.svg_polygon_id) {
    return `${sceneUrl}&area=${encodeURIComponent(area.svg_polygon_id)}`;
  } else if (area.title) {
    return `${sceneUrl}&q=${encodeURIComponent(area.title)}`;
  } else {
    return sceneUrl;
  }
}
