import { $maps } from "@/api/maps";
import { MapView } from "@/components/maps/viewer/MapView.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function MapsPage({
  sceneId,
  areaId,
  q,
}: {
  sceneId: string | undefined;
  areaId: string | undefined;
  q: string | undefined;
}) {
  const navigate = useNavigate();
  const { data: scenes } = $maps.useQuery("get", "/scenes/");
  const { data: searchResult } = $maps.useQuery(
    "get",
    "/scenes/areas/search",
    {
      params: { query: { query: q ?? "" } },
    },
    {
      enabled: q !== undefined,
    },
  );

  const requestedArea = scenes
    ?.flatMap((scene) => scene.areas)
    .find((area) => area.svg_polygon_id === areaId);
  const requestedAreas = requestedArea ? [requestedArea] : undefined;

  useEffect(() => {
    if (!searchResult || searchResult.length === 0) return;
    // Show correct floor by navigating to URL with first sceneId
    const firstSceneId = searchResult[0].scene_id;
    if (firstSceneId !== undefined && firstSceneId !== sceneId) {
      navigate({
        to: "/maps",
        search: { scene: firstSceneId, q: q },
        replace: true, // Do not add useless history entries not to break the back button
      });
    }
  }, [searchResult, sceneId, q, navigate]);

  const currentScene =
    scenes?.find((scene) => scene.scene_id === sceneId) ?? scenes?.[0];

  if (!currentScene) {
    // Loading scenes or some error...
    return <></>;
  }

  return (
    <div className="mt-1 flex grow overflow-auto">
      <MapView
        scene={currentScene}
        highlightAreas={
          searchResult?.map((res) => res.area) ?? requestedAreas ?? []
        }
      />
    </div>
  );
}
