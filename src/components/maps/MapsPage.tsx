import { $maps } from "@/api/maps";
import { MapView } from "@/components/maps/MapView.tsx";
import { Link } from "@tanstack/react-router";
import clsx from "clsx";

export function MapsPage({ sceneId }: { sceneId: string | undefined }) {
  const { data: scenes } = $maps.useQuery("get", "/scenes/");
  const currentScene =
    scenes?.find((scene) => scene.scene_id === sceneId) ?? scenes?.[0];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-row flex-wrap gap-2">
        {scenes?.map((scene) => (
          <Link
            key={scene.scene_id}
            to="/maps"
            search={{ sceneId: scene.scene_id }}
            className={clsx(
              "rounded-xl bg-primary-main px-4 py-2 text-lg font-semibold hover:bg-primary-hover",
              scene.scene_id === sceneId ? "bg-primary-hover" : "",
            )}
          >
            {scene.title}
          </Link>
        ))}
      </div>

      {currentScene && (
        <div className="flex flex-row flex-wrap gap-4 2xl:flex-nowrap">
          <div className="-mx-4 @2xl/main:-mx-12 2xl:mr-0">
            <MapView scene={currentScene} />
          </div>
          <div className="flex min-w-56 flex-col gap-2">
            <h3 className="text-2xl font-semibold">Legend:</h3>
            {currentScene.legend?.map((legendEntry) => (
              <div
                key={legendEntry.legend_id}
                className="flex flex-row items-center gap-2"
              >
                <div
                  className="h-4 w-4 rounded-full"
                  style={{ backgroundColor: legendEntry.color ?? undefined }}
                />
                <span>{legendEntry.legend}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
