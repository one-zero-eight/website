import { $maps } from "@/api/maps";
import { MapView } from "@/components/maps/viewer/MapView.tsx";
import { useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

export function MapsPage({
  sceneId,
  q,
}: {
  sceneId: string | undefined;
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

  useEffect(() => {
    // Show correct floor by navigating to URL with first sceneId
    const firstSceneId = searchResult?.[0]?.scene_id;
    if (firstSceneId !== undefined && firstSceneId !== sceneId) {
      navigate({
        to: "/maps",
        search: { sceneId: firstSceneId, q: q },
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
    <div className="mt-1 flex grow flex-col gap-4 @3xl/content:flex-row">
      <div className="min-h-[600px] grow">
        <MapView scene={currentScene} highlightAreas={searchResult ?? []} />
      </div>

      <div className="flex w-full shrink-0 flex-col gap-2 px-2 @3xl/content:w-64">
        <h3 className="text-2xl font-semibold">Legend:</h3>
        {currentScene.legend?.map((legendEntry) => (
          <div key={legendEntry.legend_id} className="flex flex-row gap-2">
            <div
              className="mt-1.5 h-4 w-4 flex-shrink-0 rounded-full"
              style={{ backgroundColor: legendEntry.color ?? undefined }}
            />
            <span className="whitespace-pre-wrap">{legendEntry.legend}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
