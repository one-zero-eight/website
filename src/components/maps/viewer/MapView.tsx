import { customFetch } from "@/api/helpers/custom-fetch.ts";
import { mapsTypes } from "@/api/maps";
import {
  getSceneGeoReference,
  isWithinViewBox,
  solveGeoTransform,
} from "@/components/maps/georeference.ts";
import { useUserLocation } from "@/components/maps/viewer/useUserLocation.ts";
import { useToast } from "@/components/toast";
import { cn } from "@/lib/ui/cn";
import { FloatingOverlay, FloatingPortal } from "@floating-ui/react";
import {
  PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { MapViewer } from "./MapViewer.tsx";

export function MapView({
  scene,
  highlightAreas,
  disablePopup = false,
}: {
  scene: mapsTypes.SchemaScene;
  highlightAreas: mapsTypes.SchemaArea[];
  disablePopup?: boolean;
}) {
  const { showError } = useToast();
  const [fullscreen, setFullscreen] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const switchFullscreen = useCallback(() => setFullscreen((v) => !v), []);

  const geoRef = useMemo(
    () => getSceneGeoReference(scene.scene_id),
    [scene.scene_id],
  );
  const geoTransform = useMemo(
    () => (geoRef ? solveGeoTransform(geoRef) : null),
    [geoRef],
  );
  // TEMPORARY dev-only: draw the raw control points on the map for calibration
  const debugControlPoints = import.meta.env.DEV
    ? geoRef?.controlPoints
    : undefined;
  const {
    position,
    status: locationStatus,
    start: startLocating,
    stop: stopLocating,
  } = useUserLocation();

  // Stop watching when leaving a scene that supports the location dot
  useEffect(() => {
    return () => stopLocating();
  }, [scene.scene_id, stopLocating]);

  // Surface permission / availability problems
  useEffect(() => {
    if (locationStatus === "denied") {
      showError(
        "Location blocked",
        "Allow location access in your browser to see your position.",
      );
    } else if (locationStatus === "unavailable") {
      showError(
        "Location unavailable",
        "This device can't provide a GPS position.",
      );
    } else if (locationStatus === "error") {
      showError("Location error", "Couldn't get a GPS fix. Try again outside.");
    }
  }, [locationStatus, showError]);

  const userLocation = useMemo(() => {
    if (!position || !geoTransform || !geoRef) return null;
    const { x, y } = geoTransform.project(position.lat, position.lon);
    const accuracyUnits = position.accuracyM * geoTransform.svgUnitsPerMeter;
    const withinBounds = isWithinViewBox(x, y);
    const accurate = position.accuracyM <= geoRef.accuracyThresholdM;
    return {
      x,
      y,
      accuracyUnits,
      accuracyM: position.accuracyM,
      heading: position.heading,
      visible: withinBounds && accurate,
      withinBounds,
      accurate,
    };
  }, [position, geoTransform, geoRef]);

  async function handleExportPdf() {
    setIsExportingPdf(true);

    try {
      const { data, error } = await customFetch.GET(
        `${import.meta.env.VITE_MAPS_API_URL}/pdf`,
        { parseAs: "blob" },
      );

      if (error || !data) {
        showError("Export failed", "Could not download maps PDF.");
        return;
      }

      const url = URL.createObjectURL(data);
      const link = document.createElement("a");
      link.href = url;
      link.download = "innohassle-maps.pdf";
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      showError("Export failed", "Could not download maps PDF.");
    } finally {
      setIsExportingPdf(false);
    }
  }

  // Set fullscreen mode when the fullscreen state changes
  useEffect(() => {
    // requestFullscreen and exitFullscreen are not supported on iPhone Safari
    if (fullscreen) {
      document.body.requestFullscreen?.();
    } else {
      if (document.fullscreenElement) {
        document.exitFullscreen?.();
      }
    }
  }, [fullscreen]);

  // Exit fullscreen mode when the user exits fullscreen mode using the browser
  useEffect(() => {
    const onFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  // Exit fullscreen mode when the user presses the Escape key
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setFullscreen(false);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <FullscreenMode enable={fullscreen}>
      <div className="relative h-full w-full overflow-hidden">
        <MapViewer
          scene={scene}
          highlightAreas={highlightAreas}
          disablePopup={disablePopup}
          userLocation={userLocation}
          debugControlPoints={debugControlPoints}
        />
        {!disablePopup && (
          <>
            <button
              type="button"
              className="bg-base-300/50 hover:bg-base-300/75 absolute top-2 right-2 flex h-fit items-center gap-1 rounded-xl px-2 py-2"
              disabled={isExportingPdf}
              onClick={handleExportPdf}
            >
              {isExportingPdf ? (
                <span className="loading loading-spinner loading-sm" />
              ) : (
                <span className="icon-[material-symbols--description-outline] text-2xl" />
              )}
              <span className="text-base font-thin">Export PDF</span>
            </button>
            {userLocation && !userLocation.visible && (
              <div className="bg-base-300/70 text-base-content absolute top-2 left-2 max-w-xs rounded-xl px-3 py-2 text-sm">
                {!userLocation.withinBounds
                  ? "Your GPS position is outside this floor plan."
                  : `Your GPS signal is too weak to show your position here (accuracy ±${Math.round(userLocation.accuracyM)}m).`}
              </div>
            )}
            <div className="absolute right-2 bottom-2 flex flex-col gap-2">
              {geoTransform && (
                <button
                  type="button"
                  className={cn(
                    "bg-base-300/50 hover:bg-base-300/75 flex h-fit justify-center rounded-xl px-2 py-2",
                    locationStatus === "active" && "text-primary",
                  )}
                  aria-label="Show my location"
                  onClick={() =>
                    locationStatus === "active" || locationStatus === "locating"
                      ? stopLocating()
                      : startLocating()
                  }
                >
                  {locationStatus === "locating" ? (
                    <span className="loading loading-spinner loading-sm" />
                  ) : (
                    <span className="icon-[material-symbols--my-location] text-2xl" />
                  )}
                </button>
              )}
              <button
                type="button"
                className="bg-base-300/50 hover:bg-base-300/75 flex h-fit rounded-xl px-2 py-2"
                onClick={() => switchFullscreen()}
              >
                <span className="icon-[material-symbols--fullscreen] text-2xl" />
              </button>
            </div>
          </>
        )}
      </div>
    </FullscreenMode>
  );
}

function FullscreenMode({
  children,
  enable,
}: PropsWithChildren<{ enable: boolean }>) {
  if (!enable) return <>{children}</>;

  return (
    <FloatingPortal>
      <FloatingOverlay className="z-10">{children}</FloatingOverlay>
    </FloatingPortal>
  );
}
